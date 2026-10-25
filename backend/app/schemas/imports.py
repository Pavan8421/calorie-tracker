"""PDF import request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ImportStatus

DateFormat = Literal["DMY", "MDY"]
ParsedRowStatus = Literal["valid", "invalid"]


class ParsedRow(BaseModel):
    row_number: int
    data: dict[str, Any] = Field(default_factory=dict)
    status: ParsedRowStatus
    errors: list[dict[str, Any]] = Field(default_factory=list)


class ImportJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    date_format: str
    status: ImportStatus
    parsed_rows: list[ParsedRow] | None = None
    error_message: str | None = None
    imported_count: int
    created_at: datetime
    updated_at: datetime


class ImportJobCreated(BaseModel):
    id: uuid.UUID
    status: ImportStatus


class ImportConfirmRequest(BaseModel):
    row_numbers: list[int] | None = None
    skip_duplicates: bool = False


class ImportConfirmResponse(BaseModel):
    id: uuid.UUID
    status: ImportStatus
    imported_count: int
    skipped_duplicates: int = 0
