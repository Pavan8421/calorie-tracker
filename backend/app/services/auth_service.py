"""Authentication business logic."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AuthError, ConflictError
from app.core.rate_limit import check_rate_limit
from app.models.user import User
from app.repositories import token_repo, user_repo
from app.schemas.auth import LoginRequest, RegisterRequest


@dataclass(frozen=True)
class AuthTokens:
    access_token: str
    refresh_token: str
    user: User


async def register(session: AsyncSession, data: RegisterRequest) -> User:
    existing = await user_repo.get_by_email(session, data.email)
    if existing is not None:
        raise ConflictError(
            code="EMAIL_ALREADY_REGISTERED",
            message="An account with this email already exists",
        )

    user = await user_repo.create_user(
        session,
        email=data.email,
        password_hash=security.hash_password(data.password),
        full_name=data.full_name,
        timezone=data.timezone,
    )
    await session.commit()
    await session.refresh(user)
    return user


async def login(
    session: AsyncSession,
    data: LoginRequest,
    *,
    client_ip: str,
) -> AuthTokens:
    await check_rate_limit(
        "login",
        f"{client_ip}:{data.email}",
        limit=5,
        window_seconds=60,
        message="Too many login attempts. Please try again later.",
    )

    user = await user_repo.get_by_email(session, data.email)
    if user is None or not security.verify_password(data.password, user.password_hash):
        raise AuthError(code="INVALID_CREDENTIALS", message="Invalid email or password")

    tokens = await _issue_tokens(session, user)
    await session.commit()
    await session.refresh(user)
    return AuthTokens(access_token=tokens[0], refresh_token=tokens[1], user=user)


async def refresh(session: AsyncSession, raw_refresh_token: str | None) -> AuthTokens:
    if not raw_refresh_token:
        raise AuthError(code="INVALID_REFRESH_TOKEN", message="Refresh token missing")

    token_hash = security.hash_refresh_token(raw_refresh_token)
    stored = await token_repo.get_by_hash(session, token_hash)
    if stored is None:
        raise AuthError(code="INVALID_REFRESH_TOKEN", message="Invalid refresh token")

    # Reuse detection: already-revoked token presented again.
    if stored.revoked_at is not None:
        await token_repo.revoke_all_for_user(session, stored.user_id)
        await session.commit()
        raise AuthError(
            code="REFRESH_TOKEN_REUSE",
            message="Refresh token reuse detected. Please log in again.",
        )

    if stored.expires_at <= datetime.now(UTC):
        await token_repo.revoke_token(session, stored)
        await session.commit()
        raise AuthError(code="INVALID_REFRESH_TOKEN", message="Refresh token expired")

    user = await user_repo.get_by_id(session, stored.user_id)
    if user is None:
        raise AuthError(code="INVALID_REFRESH_TOKEN", message="Invalid refresh token")

    # Rotation: revoke old, issue new pair.
    await token_repo.revoke_token(session, stored)
    access_token, new_refresh = await _issue_tokens(session, user)
    await session.commit()
    await session.refresh(user)
    return AuthTokens(access_token=access_token, refresh_token=new_refresh, user=user)


async def logout(session: AsyncSession, raw_refresh_token: str | None) -> None:
    if not raw_refresh_token:
        return
    token_hash = security.hash_refresh_token(raw_refresh_token)
    stored = await token_repo.get_by_hash(session, token_hash)
    if stored is not None:
        await token_repo.revoke_token(session, stored)
        await session.commit()


async def _issue_tokens(session: AsyncSession, user: User) -> tuple[str, str]:
    access_token = security.create_access_token(user.id)
    raw_refresh = security.generate_refresh_token()
    await token_repo.create_token(
        session,
        user_id=user.id,
        token_hash=security.hash_refresh_token(raw_refresh),
        expires_at=security.refresh_token_expiry(),
    )
    return access_token, raw_refresh
