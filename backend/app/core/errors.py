"""Domain errors and FastAPI exception handlers."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base application error raised by services."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, code: str = "NOT_FOUND", message: str = "Resource not found") -> None:
        super().__init__(code, message, status.HTTP_404_NOT_FOUND)


class ConflictError(AppError):
    def __init__(self, code: str = "CONFLICT", message: str = "Conflict") -> None:
        super().__init__(code, message, status.HTTP_409_CONFLICT)


class AuthError(AppError):
    def __init__(self, code: str = "UNAUTHORIZED", message: str = "Unauthorized") -> None:
        super().__init__(code, message, status.HTTP_401_UNAUTHORIZED)


class PermissionError(AppError):
    def __init__(self, code: str = "FORBIDDEN", message: str = "Forbidden") -> None:
        super().__init__(code, message, status.HTTP_403_FORBIDDEN)


class BusinessRuleError(AppError):
    def __init__(
        self,
        code: str = "BUSINESS_RULE_VIOLATION",
        message: str = "Business rule violation",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(code, message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


class RateLimitError(AppError):
    def __init__(
        self,
        code: str = "RATE_LIMITED",
        message: str = "Too many requests",
        retry_after: int | None = None,
    ) -> None:
        super().__init__(code, message, status.HTTP_429_TOO_MANY_REQUESTS)
        self.retry_after = retry_after


class ExternalServiceError(AppError):
    def __init__(
        self,
        code: str = "EXTERNAL_SERVICE_ERROR",
        message: str = "External service error",
        status_code: int = status.HTTP_503_SERVICE_UNAVAILABLE,
    ) -> None:
        super().__init__(code, message, status_code)


def error_body(
    code: str,
    message: str,
    details: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details or []}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        headers: dict[str, str] = {}
        if isinstance(exc, RateLimitError) and exc.retry_after is not None:
            headers["Retry-After"] = str(exc.retry_after)
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(exc.code, exc.message, exc.details),
            headers=headers or None,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details: list[dict[str, Any]] = []
        for err in exc.errors():
            loc = err.get("loc", ())
            field = ".".join(str(part) for part in loc if part != "body")
            details.append({"field": field or None, "message": err.get("msg", "Invalid value")})
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_body("VALIDATION_ERROR", "Request validation failed", details),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "HTTP_ERROR"
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            code = "NOT_FOUND"
        elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
            code = "UNAUTHORIZED"
        elif exc.status_code == status.HTTP_403_FORBIDDEN:
            code = "FORBIDDEN"
        message = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(code, message),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(getattr(request, "state", None), "request_id", None)
        logger.exception(
            "Unhandled exception",
            extra={"request_id": request_id, "path": str(request.url.path)},
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_body("INTERNAL_ERROR", "An unexpected error occurred"),
        )
