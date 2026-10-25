"""PDF import endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.deps import CurrentUser, DbSession, get_pagination_params
from app.core.rate_limit import check_rate_limit
from app.schemas.common import Page, PaginationParams
from app.schemas.imports import (
    ImportConfirmRequest,
    ImportConfirmResponse,
    ImportJobCreated,
    ImportJobRead,
)
from app.services import import_service

router = APIRouter()

DateFormatForm = Literal["DMY", "MDY"]


@router.post("", response_model=ImportJobCreated, status_code=202)
async def upload_import(
    current_user: CurrentUser,
    session: DbSession,
    file: Annotated[UploadFile, File(description="Food diary PDF")],
    date_format: Annotated[DateFormatForm, Form()] = "DMY",
) -> ImportJobCreated:
    await check_rate_limit(
        "pdf_import",
        str(current_user.id),
        limit=10,
        window_seconds=3600,
        message="Too many PDF imports. Please try again later.",
    )
    return await import_service.create_import(
        session,
        current_user,
        file.file,
        filename=file.filename or "upload.pdf",
        date_format=date_format,
    )


@router.get("", response_model=Page[ImportJobRead])
async def list_imports(
    current_user: CurrentUser,
    session: DbSession,
    params: Annotated[PaginationParams, Depends(get_pagination_params)],
) -> Page[ImportJobRead]:
    return await import_service.list_imports(session, current_user, params)


@router.get("/{job_id}", response_model=ImportJobRead)
async def get_import(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> ImportJobRead:
    return await import_service.get_import(session, current_user, job_id)


@router.post("/{job_id}/confirm", response_model=ImportConfirmResponse)
async def confirm_import(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    body: ImportConfirmRequest | None = None,
) -> ImportConfirmResponse:
    return await import_service.confirm_import(
        session,
        current_user,
        job_id,
        body or ImportConfirmRequest(),
    )
