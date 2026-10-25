"""PDF import upload, status, and confirm."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, date, datetime
from typing import BinaryIO
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    AppError,
    BusinessRuleError,
    ConflictError,
    ExternalServiceError,
    NotFoundError,
)
from app.core.redis import enqueue_pdf_import
from app.core.time import to_local_date
from app.integrations.pdf_parser import count_pdf_pages
from app.models.enums import EntrySource, ImportStatus
from app.models.user import User
from app.repositories import entry_repo, import_repo
from app.schemas.common import Page, PaginationParams
from app.schemas.entry import FoodEntryCreate
from app.schemas.imports import (
    DateFormat,
    ImportConfirmRequest,
    ImportConfirmResponse,
    ImportJobCreated,
    ImportJobRead,
    ParsedRow,
)

logger = logging.getLogger(__name__)

_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
_MAX_PAGES = 20
_PDF_MAGIC = b"%PDF"


def _to_read(job: object) -> ImportJobRead:
    return ImportJobRead.model_validate(job)


def _validate_pdf_bytes(raw: bytes) -> None:
    if not raw.startswith(_PDF_MAGIC):
        raise AppError(
            code="UNSUPPORTED_MEDIA",
            message="File must be a PDF",
            status_code=415,
        )
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise BusinessRuleError(
            code="FILE_TOO_LARGE",
            message="PDF must be 10 MB or smaller",
            details=[{"field": "file", "message": "Max size is 10 MB"}],
        )
    try:
        pages = count_pdf_pages(raw)
    except Exception as exc:
        raise BusinessRuleError(
            code="INVALID_PDF",
            message="Could not read PDF",
            details=[{"field": "file", "message": str(exc)}],
        ) from exc
    if pages > _MAX_PAGES:
        raise BusinessRuleError(
            code="PDF_TOO_MANY_PAGES",
            message=f"PDF must have at most {_MAX_PAGES} pages",
            details=[{"field": "file", "message": f"Found {pages} pages"}],
        )


async def create_import(
    session: AsyncSession,
    user: User,
    file_obj: BinaryIO,
    *,
    filename: str,
    date_format: DateFormat = "DMY",
) -> ImportJobCreated:
    raw = file_obj.read()
    if isinstance(raw, str):
        raw = raw.encode("utf-8")
    _validate_pdf_bytes(raw)

    safe_name = (filename or "upload.pdf").strip()[:255] or "upload.pdf"
    job = await import_repo.create_job(
        session,
        user_id=user.id,
        filename=safe_name,
        file_data=raw,
        date_format=date_format,
    )
    await session.commit()
    await session.refresh(job)

    try:
        await enqueue_pdf_import(job.id)
    except Exception as exc:
        logger.exception("Failed to enqueue import job %s", job.id)
        job.status = ImportStatus.failed
        job.error_message = "Could not enqueue import job. Please try again."
        job.file_data = None
        await session.commit()
        raise ExternalServiceError(
            code="QUEUE_UNAVAILABLE",
            message="Import queue is unavailable. Please try again later.",
        ) from exc

    return ImportJobCreated(id=job.id, status=job.status)


async def list_imports(
    session: AsyncSession,
    user: User,
    params: PaginationParams,
) -> Page[ImportJobRead]:
    page = await import_repo.list_jobs(session, user.id, params)
    return Page.create(
        items=[_to_read(j) for j in page.items],
        total=page.total,
        params=params,
    )


async def get_import(
    session: AsyncSession,
    user: User,
    job_id: uuid.UUID,
) -> ImportJobRead:
    job = await import_repo.get_job(session, job_id)
    if job is None or job.user_id != user.id:
        raise NotFoundError(code="NOT_FOUND", message="Import job not found")
    return _to_read(job)


def _row_consumed_on(data: dict, user: User) -> date:
    if data.get("consumed_on"):
        value = data["consumed_on"]
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        return date.fromisoformat(str(value)[:10])
    consumed_at = data.get("consumed_at")
    if consumed_at:
        if isinstance(consumed_at, str):
            consumed_at = datetime.fromisoformat(consumed_at.replace("Z", "+00:00"))
        return to_local_date(consumed_at, user.timezone)
    return to_local_date(datetime.now(UTC), user.timezone)


def _row_consumed_at(data: dict, user: User) -> datetime:
    if data.get("consumed_at"):
        value = data["consumed_at"]
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=UTC)
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    d = _row_consumed_on(data, user)
    local = datetime(d.year, d.month, d.day, 12, 0, tzinfo=ZoneInfo(user.timezone))
    return local.astimezone(UTC)


async def confirm_import(
    session: AsyncSession,
    user: User,
    job_id: uuid.UUID,
    body: ImportConfirmRequest,
) -> ImportConfirmResponse:
    job = await import_repo.get_job(session, job_id)
    if job is None or job.user_id != user.id:
        raise NotFoundError(code="NOT_FOUND", message="Import job not found")

    if job.status != ImportStatus.preview_ready:
        raise ConflictError(
            code="IMPORT_NOT_READY",
            message="Import is not ready to confirm (wrong status or already completed)",
        )

    rows = [ParsedRow.model_validate(r) for r in (job.parsed_rows or [])]
    valid = [r for r in rows if r.status == "valid"]
    if body.row_numbers is not None:
        wanted = set(body.row_numbers)
        selected = [r for r in valid if r.row_number in wanted]
    else:
        selected = valid

    imported = 0
    skipped = 0
    for row in selected:
        create = FoodEntryCreate.model_validate(row.data)
        consumed_at = _row_consumed_at(row.data, user)
        consumed_on = _row_consumed_on(row.data, user)

        if body.skip_duplicates:
            existing = await import_repo.find_duplicate_entry(
                session,
                user_id=user.id,
                consumed_on=consumed_on,
                meal_type=create.meal_type,
                food_name=create.food_name,
                calories_kcal=create.calories_kcal,
            )
            if existing is not None:
                skipped += 1
                continue

        await entry_repo.create_entry(
            session,
            user_id=user.id,
            meal_type=create.meal_type,
            food_name=create.food_name,
            quantity=create.quantity,
            unit=create.unit,
            consumed_at=consumed_at,
            consumed_on=consumed_on,
            calories_kcal=create.calories_kcal,
            protein_g=create.protein_g,
            carbs_g=create.carbs_g,
            fat_g=create.fat_g,
            fiber_g=create.fiber_g,
            sugar_g=create.sugar_g,
            micronutrients=create.micronutrients,
            source=EntrySource.pdf_import,
            notes=create.notes,
            import_job_id=job.id,
        )
        imported += 1

    job.status = ImportStatus.completed
    job.imported_count = imported
    await session.commit()
    await session.refresh(job)

    return ImportConfirmResponse(
        id=job.id,
        status=job.status,
        imported_count=imported,
        skipped_duplicates=skipped,
    )
