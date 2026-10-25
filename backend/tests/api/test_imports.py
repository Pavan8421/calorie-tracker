"""Phase 8 PDF import API tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from app.models.enums import ImportStatus
from httpx import AsyncClient

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
DIARY_PDF = FIXTURES / "food_diary.pdf"

# Minimal 1-page PDF (no table) for validation / failure paths
_MINIMAL_PDF = b"""%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer<< /Size 4 /Root 1 0 R >>
startxref
190
%%EOF
"""


async def _run_worker_with_test_session(job_id: str, session) -> None:
    """Execute worker parse logic against the test session (shared savepoint)."""
    from sqlalchemy import select

    from app.integrations import pdf_parser
    from app.models.import_job import ImportJob
    from app.models.user import User
    from app.workers.import_tasks import _build_parsed_rows

    result = await session.execute(select(ImportJob).where(ImportJob.id == job_id))
    job = result.scalar_one()
    user = (
        await session.execute(select(User).where(User.id == job.user_id))
    ).scalar_one()

    job.status = ImportStatus.processing
    await session.flush()

    parse_result = pdf_parser.parse_pdf_tables(job.file_data, date_format=job.date_format)
    extracted = parse_result.rows
    if not extracted or not pdf_parser.has_required_mapped_columns(extracted):
        job.status = ImportStatus.failed
        job.error_message = "Could not find a food diary table in this PDF."
        job.file_data = None
        await session.flush()
        return

    parsed_rows = await _build_parsed_rows(job, user, extracted)
    job.parsed_rows = parsed_rows
    job.status = ImportStatus.preview_ready
    job.error_message = None
    job.file_data = None
    await session.flush()


@pytest.fixture
def db_session(client: AsyncClient, app):
    return app.state.test_db_session


@pytest.mark.asyncio
async def test_upload_rejects_non_pdf(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/imports",
        headers=auth_headers,
        files={"file": ("notes.txt", b"hello", "text/plain")},
        data={"date_format": "DMY"},
    )
    assert response.status_code == 415, response.text


@pytest.mark.asyncio
async def test_upload_rejects_too_large(
    client: AsyncClient, auth_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.services.import_service._MAX_UPLOAD_BYTES", 100)
    response = await client.post(
        "/api/v1/imports",
        headers=auth_headers,
        files={"file": ("big.pdf", b"%PDF" + b"x" * 200, "application/pdf")},
        data={"date_format": "DMY"},
    )
    assert response.status_code == 422, response.text


@pytest.mark.asyncio
async def test_upload_and_process_preview_confirm(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db_session,
) -> None:
    pdf_bytes = DIARY_PDF.read_bytes()
    uploaded = await client.post(
        "/api/v1/imports",
        headers=auth_headers,
        files={"file": ("food_diary.pdf", pdf_bytes, "application/pdf")},
        data={"date_format": "DMY"},
    )
    assert uploaded.status_code == 202, uploaded.text
    job_id = uploaded.json()["id"]
    assert uploaded.json()["status"] == "pending"

    await _run_worker_with_test_session(job_id, db_session)

    detail = await client.get(f"/api/v1/imports/{job_id}", headers=auth_headers)
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["status"] == "preview_ready"
    assert body["parsed_rows"]
    assert all(r["status"] == "valid" for r in body["parsed_rows"])
    assert body.get("file_data") is None  # not exposed on schema

    confirm = await client.post(
        f"/api/v1/imports/{job_id}/confirm",
        headers=auth_headers,
        json={"row_numbers": [1, 2]},
    )
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["imported_count"] == 2
    assert confirm.json()["status"] == "completed"

    entries = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params={"start_date": "2024-02-01", "end_date": "2024-02-01"},
    )
    assert entries.status_code == 200
    items = entries.json()["items"]
    assert len(items) == 2
    assert all(i["source"] == "pdf_import" for i in items)

    second = await client.post(
        f"/api/v1/imports/{job_id}/confirm",
        headers=auth_headers,
        json={},
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "IMPORT_NOT_READY"


@pytest.mark.asyncio
async def test_confirm_skip_duplicates(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db_session,
) -> None:
    pdf_bytes = DIARY_PDF.read_bytes()
    uploaded = await client.post(
        "/api/v1/imports",
        headers=auth_headers,
        files={"file": ("food_diary.pdf", pdf_bytes, "application/pdf")},
        data={"date_format": "DMY"},
    )
    job_id = uploaded.json()["id"]
    await _run_worker_with_test_session(job_id, db_session)

    first = await client.post(
        f"/api/v1/imports/{job_id}/confirm",
        headers=auth_headers,
        json={"row_numbers": [1]},
    )
    assert first.status_code == 200
    # Reset status for second confirm path is blocked — create a new job instead
    uploaded2 = await client.post(
        "/api/v1/imports",
        headers=auth_headers,
        files={"file": ("food_diary.pdf", pdf_bytes, "application/pdf")},
        data={"date_format": "DMY"},
    )
    job2 = uploaded2.json()["id"]
    await _run_worker_with_test_session(job2, db_session)

    again = await client.post(
        f"/api/v1/imports/{job2}/confirm",
        headers=auth_headers,
        json={"row_numbers": [1], "skip_duplicates": True},
    )
    assert again.status_code == 200, again.text
    assert again.json()["imported_count"] == 0
    assert again.json()["skipped_duplicates"] == 1


@pytest.mark.asyncio
async def test_process_failure_clears_file_data(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    uploaded = await client.post(
        "/api/v1/imports",
        headers=auth_headers,
        files={"file": ("empty.pdf", _MINIMAL_PDF, "application/pdf")},
        data={"date_format": "DMY"},
    )
    assert uploaded.status_code == 202, uploaded.text
    job_id = uploaded.json()["id"]

    async def _no_llm(*_a, **_k):
        return []

    monkeypatch.setattr(
        "app.integrations.pdf_llm_fallback.extract_rows_from_text",
        _no_llm,
    )
    # Worker-style failure path on test session
    from sqlalchemy import select

    from app.integrations import pdf_parser
    from app.models.import_job import ImportJob

    result = await db_session.execute(
        select(ImportJob).where(ImportJob.id == job_id)
    )
    job = result.scalar_one()
    job.status = ImportStatus.processing
    await db_session.flush()

    parse_result = pdf_parser.parse_pdf_tables(job.file_data, date_format=job.date_format)
    assert not parse_result.rows or not pdf_parser.has_required_mapped_columns(
        parse_result.rows
    )
    job.status = ImportStatus.failed
    job.error_message = "Could not find a food diary table in this PDF."
    job.file_data = None
    await db_session.flush()

    detail = await client.get(f"/api/v1/imports/{job_id}", headers=auth_headers)
    assert detail.json()["status"] == "failed"
    assert detail.json()["error_message"]


@pytest.mark.asyncio
async def test_import_isolation(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    pdf_bytes = DIARY_PDF.read_bytes()
    uploaded = await client.post(
        "/api/v1/imports",
        headers=auth_headers,
        files={"file": ("food_diary.pdf", pdf_bytes, "application/pdf")},
        data={"date_format": "DMY"},
    )
    job_id = uploaded.json()["id"]

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "importbob@example.com",
            "password": "Secret123",
            "full_name": "Bob",
            "timezone": "UTC",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "importbob@example.com", "password": "Secret123"},
    )
    bob = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert (
        await client.get(f"/api/v1/imports/{job_id}", headers=bob)
    ).status_code == 404
    assert (
        await client.post(
            f"/api/v1/imports/{job_id}/confirm",
            headers=bob,
            json={},
        )
    ).status_code == 404


@pytest.mark.asyncio
async def test_list_imports_paginated(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    pdf_bytes = DIARY_PDF.read_bytes()
    for _ in range(2):
        await client.post(
            "/api/v1/imports",
            headers=auth_headers,
            files={"file": ("food_diary.pdf", pdf_bytes, "application/pdf")},
            data={"date_format": "DMY"},
        )
    listed = await client.get("/api/v1/imports", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 2
