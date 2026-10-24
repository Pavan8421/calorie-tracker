"""Shared FastAPI dependencies."""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AuthError
from app.core.security import decode_access_token
from app.db.session import get_db as _get_db
from app.models.user import User
from app.repositories import user_repo
from app.schemas.common import PaginationParams, get_pagination

get_db = _get_db
get_pagination_params = get_pagination

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthError(code="UNAUTHORIZED", message="Not authenticated")

    try:
        user_id: uuid.UUID = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise AuthError(code="TOKEN_EXPIRED", message="Access token expired") from exc
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise AuthError(code="UNAUTHORIZED", message="Invalid access token") from exc

    user = await user_repo.get_by_id(session, user_id)
    if user is None:
        raise AuthError(code="UNAUTHORIZED", message="Invalid access token")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

__all__ = [
    "AsyncSession",
    "AsyncGenerator",
    "get_db",
    "get_pagination_params",
    "PaginationParams",
    "get_current_user",
    "CurrentUser",
    "DbSession",
]
