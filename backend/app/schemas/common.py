"""Shared Pydantic schemas: pagination and error envelope."""

from __future__ import annotations

from math import ceil

from fastapi import Query
from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def get_pagination(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)


class Page[T](BaseModel):
    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int

    @classmethod
    def create(cls, items: list[T], total: int, params: PaginationParams) -> Page[T]:
        total_pages = ceil(total / params.page_size) if params.page_size else 0
        return cls(
            items=items,
            page=params.page,
            page_size=params.page_size,
            total=total,
            total_pages=total_pages,
        )


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: ErrorBody
