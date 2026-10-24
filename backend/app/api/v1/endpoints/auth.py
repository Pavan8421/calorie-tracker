"""Auth endpoints: register, login, refresh, logout."""

from __future__ import annotations

from fastapi import APIRouter, Request, Response

from app.api.cookies import (
    REFRESH_COOKIE_NAME,
    clear_refresh_cookie,
    set_refresh_cookie,
)
from app.api.deps import DbSession
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserRead
from app.services import auth_service

router = APIRouter()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


@router.post("/register", response_model=UserRead, status_code=201)
async def register(body: RegisterRequest, session: DbSession) -> UserRead:
    user = await auth_service.register(session, body)
    return UserRead.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    session: DbSession,
) -> TokenResponse:
    result = await auth_service.login(session, body, client_ip=_client_ip(request))
    set_refresh_cookie(response, result.refresh_token)
    return TokenResponse(
        access_token=result.access_token,
        user=UserRead.model_validate(result.user),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(
    request: Request,
    response: Response,
    session: DbSession,
) -> AccessTokenResponse:
    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    result = await auth_service.refresh(session, raw)
    set_refresh_cookie(response, result.refresh_token)
    return AccessTokenResponse(
        access_token=result.access_token,
        user=UserRead.model_validate(result.user),
    )


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    session: DbSession,
) -> None:
    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    await auth_service.logout(session, raw)
    clear_refresh_cookie(response)
