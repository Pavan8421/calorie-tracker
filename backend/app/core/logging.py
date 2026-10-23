"""Structured logging and request-id middleware."""

from __future__ import annotations

import logging
import time
import uuid

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import get_settings


def setup_logging() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


class RequestIdMiddleware:
    """Attach a request id to every request and response (pure ASGI).

    Implemented as pure ASGI instead of BaseHTTPMiddleware so FastAPI
    exception handlers still run for unhandled errors.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        request_id = headers.get("x-request-id") or str(uuid.uuid4())
        scope.setdefault("state", {})
        scope["state"]["request_id"] = request_id

        started = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                raw_headers = list(message.get("headers", []))
                raw_headers.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": raw_headers}
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            if scope["type"] == "http":
                duration_ms = (time.perf_counter() - started) * 1000
                path = scope.get("path", "")
                method = scope.get("method", "")
                logging.getLogger("app.access").info(
                    "%s %s %s %.1fms",
                    method,
                    path,
                    status_code,
                    duration_ms,
                    extra={"request_id": request_id},
                )
