"""Error envelope tests."""

from __future__ import annotations

import pytest
from app.core.errors import register_exception_handlers
from app.core.logging import RequestIdMiddleware
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel, Field


class EchoBody(BaseModel):
    name: str = Field(min_length=1)
    age: int = Field(ge=0)


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)
    register_exception_handlers(app)

    @app.post("/_test/echo")
    async def echo(body: EchoBody) -> EchoBody:
        return body

    @app.get("/_test/boom")
    async def boom() -> None:
        raise RuntimeError("secret internals")

    return app


@pytest.fixture
async def error_client() -> AsyncClient:
    app = _build_test_app()
    # ServerErrorMiddleware always re-raises after handling Exception;
    # disable that so we can assert on the JSON error envelope.
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_validation_error_envelope(error_client: AsyncClient) -> None:
    response = await error_client.post("/_test/echo", json={"name": "", "age": -1})

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["message"] == "Request validation failed"
    assert isinstance(body["error"]["details"], list)
    assert len(body["error"]["details"]) >= 1
    fields = {d.get("field") for d in body["error"]["details"]}
    assert "name" in fields or "age" in fields


@pytest.mark.asyncio
async def test_unhandled_exception_hides_internals(error_client: AsyncClient) -> None:
    response = await error_client.get("/_test/boom")

    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert body["error"]["message"] == "An unexpected error occurred"
    assert "secret" not in response.text.lower()
    assert "RuntimeError" not in response.text
