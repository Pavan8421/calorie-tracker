"""arq task: parse uploaded PDF into preview rows."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any
from zoneinfo import ZoneInfo

from pydantic import ValidationError
from sqlalchemy import select

from app.core.time import to_local_date
from app.db.session import AsyncSessionLocal
from app.integrations import pdf_llm_fallback, pdf_parser
from app.models.enums import ImportStatus
from app.models.import_job import ImportJob
from app.models.user import User
from app.schemas.entry import FoodEntryCreate

logger = logging.getLogger(__name__)


def _consumed_at_for_date(diary_date: Any, timezone: str) -> datetime | None:
    if diary_date is None:
        return None
    from datetime import date as date_cls

    if isinstance(diary_date, datetime):
        d = to_local_date(diary_date, timezone)
    elif isinstance(diary_date, date_cls):
        d = diary_date
    else:
        return None
    local = datetime(d.year, d.month, d.day, 12, 0, tzinfo=ZoneInfo(timezone))
    return local.astimezone(UTC)


def _validation_errors(exc: ValidationError) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for err in exc.errors():
        loc = err.get("loc", ())
        field = ".".join(str(part) for part in loc)
        out.append({"field": field or None, "message": err.get("msg", "Invalid value")})
    return out


async def _build_parsed_rows(
    job: ImportJob,
    user: User,
    extracted_rows: list[pdf_parser.ExtractedRow],
) -> list[dict[str, Any]]:
    parsed: list[dict[str, Any]] = []
    for index, extracted in enumerate(extracted_rows, start=1):
        shaped = pdf_parser.shape_row_for_validation(
            extracted, date_format=job.date_format
        )
        diary_date = shaped.pop("_diary_date", None)
        consumed_at = _consumed_at_for_date(diary_date, user.timezone)
        if consumed_at is not None:
            shaped["consumed_at"] = consumed_at

        try:
            validated = FoodEntryCreate.model_validate(shaped)
            data = validated.model_dump(mode="json")
            # Keep diary date explicit for confirm / duplicate checks
            if diary_date is not None:
                data["consumed_on"] = (
                    diary_date.isoformat()
                    if hasattr(diary_date, "isoformat")
                    else str(diary_date)
                )
            parsed.append(
                {
                    "row_number": index,
                    "data": data,
                    "status": "valid",
                    "errors": [],
                }
            )
        except ValidationError as exc:
            parsed.append(
                {
                    "row_number": index,
                    "data": {
                        k: (str(v) if v is not None else None)
                        for k, v in shaped.items()
                    },
                    "status": "invalid",
                    "errors": _validation_errors(exc),
                }
            )
    return parsed


async def process_pdf_import(ctx: dict[str, Any], job_id: str) -> None:
    """Worker entrypoint: pending/processing → preview_ready | failed."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        logger.error("Invalid import job id: %s", job_id)
        return

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ImportJob).where(ImportJob.id == job_uuid))
        job = result.scalar_one_or_none()
        if job is None:
            logger.warning("Import job not found: %s", job_id)
            return

        user_result = await session.execute(select(User).where(User.id == job.user_id))
        user = user_result.scalar_one_or_none()
        if user is None:
            job.status = ImportStatus.failed
            job.error_message = "User not found for import job"
            job.file_data = None
            await session.commit()
            return

        job.status = ImportStatus.processing
        await session.commit()

        try:
            file_bytes = job.file_data
            if not file_bytes:
                raise ValueError("PDF data is missing for this import job")

            parse_result = pdf_parser.parse_pdf_tables(
                file_bytes, date_format=job.date_format
            )
            extracted = parse_result.rows
            used_fallback = False

            if not extracted or not pdf_parser.has_required_mapped_columns(extracted):
                text = pdf_parser.extract_text_from_pdf(file_bytes)
                extracted = await pdf_llm_fallback.extract_rows_from_text(
                    text, date_format=job.date_format
                )
                used_fallback = True
                if not extracted:
                    raise ValueError(
                        "Could not find a food diary table in this PDF. "
                        "Ensure it has columns for date, food name, and calories."
                    )

            parsed_rows = await _build_parsed_rows(job, user, extracted)
            job.parsed_rows = parsed_rows
            job.status = ImportStatus.preview_ready
            job.error_message = None
            job.file_data = None
            logger.info(
                "Import %s ready (%d rows, llm_fallback=%s)",
                job_id,
                len(parsed_rows),
                used_fallback,
            )
            await session.commit()
        except Exception as exc:
            logger.exception("Import job %s failed", job_id)
            await session.rollback()
            # Re-load and mark failed
            result = await session.execute(
                select(ImportJob).where(ImportJob.id == job_uuid)
            )
            job = result.scalar_one_or_none()
            if job is not None:
                job.status = ImportStatus.failed
                job.error_message = str(exc)[:2000] or "PDF import failed"
                job.file_data = None
                await session.commit()
