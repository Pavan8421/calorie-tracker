"""Pagination helper unit tests."""

from __future__ import annotations

from app.schemas.common import Page, PaginationParams


def test_page_create_basic() -> None:
    params = PaginationParams(page=1, page_size=20)
    page = Page.create(items=["a", "b"], total=42, params=params)

    assert page.items == ["a", "b"]
    assert page.page == 1
    assert page.page_size == 20
    assert page.total == 42
    assert page.total_pages == 3


def test_page_create_exact_page_boundary() -> None:
    params = PaginationParams(page=2, page_size=10)
    page = Page.create(items=list(range(10)), total=20, params=params)

    assert page.total_pages == 2
    assert page.page == 2


def test_page_create_empty() -> None:
    params = PaginationParams(page=1, page_size=20)
    page = Page.create(items=[], total=0, params=params)

    assert page.total == 0
    assert page.total_pages == 0
    assert page.items == []


def test_pagination_params_offset() -> None:
    assert PaginationParams(page=1, page_size=20).offset == 0
    assert PaginationParams(page=3, page_size=20).offset == 40


def test_page_create_partial_last_page() -> None:
    params = PaginationParams(page=3, page_size=10)
    page = Page.create(items=[1, 2, 3], total=23, params=params)

    assert page.total_pages == 3
    assert len(page.items) == 3
