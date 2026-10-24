"""Phase 1 auth API tests."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from app.api.cookies import REFRESH_COOKIE_NAME
from app.core.config import get_settings
from httpx import AsyncClient


def _register_payload(**overrides: object) -> dict:
    data = {
        "email": "user@example.com",
        "password": "Secret123",
        "full_name": "Test User",
        "timezone": "UTC",
    }
    data.update(overrides)
    return data


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/register", json=_register_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "user@example.com"
    assert body["full_name"] == "Test User"
    assert body["timezone"] == "UTC"
    assert "id" in body
    assert "password" not in body
    assert "password_hash" not in body


@pytest.mark.asyncio
async def test_register_lowercases_email(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json=_register_payload(email="Mixed.Case@Example.COM"),
    )

    assert response.status_code == 201
    assert response.json()["email"] == "mixed.case@example.com"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json=_register_payload())
    response = await client.post("/api/v1/auth/register", json=_register_payload())

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json=_register_payload(password="allletters"),
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_register_invalid_timezone(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json=_register_payload(timezone="Not/A_Zone"),
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_register_legacy_timezone_alias(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json=_register_payload(timezone="Asia/Calcutta"),
    )

    assert response.status_code == 201
    assert response.json()["timezone"] == "Asia/Kolkata"


@pytest.mark.asyncio
async def test_login_success_sets_refresh_cookie(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json=_register_payload())
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "Secret123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "user@example.com"
    assert REFRESH_COOKIE_NAME in response.cookies


@pytest.mark.asyncio
async def test_login_wrong_email_and_password_same_error(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json=_register_payload())

    wrong_email = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "Secret123"},
    )
    wrong_password = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "Wrong999"},
    )

    assert wrong_email.status_code == 401
    assert wrong_password.status_code == 401
    assert wrong_email.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert wrong_password.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert wrong_email.json()["error"]["message"] == wrong_password.json()["error"]["message"]


@pytest.mark.asyncio
async def test_refresh_rotates_token(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json=_register_payload())
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "Secret123"},
    )
    old_refresh = login.cookies.get(REFRESH_COOKIE_NAME)
    assert old_refresh

    refresh = await client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 200
    assert "access_token" in refresh.json()
    new_refresh = refresh.cookies.get(REFRESH_COOKIE_NAME)
    assert new_refresh
    assert new_refresh != old_refresh

    # Old refresh cookie should no longer work (client may still send new cookie).
    client.cookies.set(REFRESH_COOKIE_NAME, old_refresh, path="/api/v1/auth")
    reuse = await client.post("/api/v1/auth/refresh")
    assert reuse.status_code == 401
    assert reuse.json()["error"]["code"] in {"REFRESH_TOKEN_REUSE", "INVALID_REFRESH_TOKEN"}


@pytest.mark.asyncio
async def test_refresh_reuse_revokes_all_tokens(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json=_register_payload())
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "Secret123"},
    )
    old_refresh = login.cookies.get(REFRESH_COOKIE_NAME)

    first_refresh = await client.post("/api/v1/auth/refresh")
    assert first_refresh.status_code == 200
    current_refresh = first_refresh.cookies.get(REFRESH_COOKIE_NAME)

    # Present the revoked (old) token → reuse detection.
    client.cookies.set(REFRESH_COOKIE_NAME, old_refresh, path="/api/v1/auth")
    reuse = await client.post("/api/v1/auth/refresh")
    assert reuse.status_code == 401
    assert reuse.json()["error"]["code"] == "REFRESH_TOKEN_REUSE"

    # The previously valid rotated token should also be revoked.
    client.cookies.set(REFRESH_COOKIE_NAME, current_refresh, path="/api/v1/auth")
    again = await client.post("/api/v1/auth/refresh")
    assert again.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_and_clears_cookie(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json=_register_payload())
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "Secret123"},
    )
    refresh_before = login.cookies.get(REFRESH_COOKIE_NAME)
    assert refresh_before

    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 204

    # Cookie cleared / refresh no longer valid.
    client.cookies.set(REFRESH_COOKIE_NAME, refresh_before, path="/api/v1/auth")
    refresh = await client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 401


@pytest.mark.asyncio
async def test_users_me_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_users_me_with_token(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    response = await client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_users_me_expired_token(client: AsyncClient, registered_user: dict) -> None:
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    user_id = login.json()["user"]["id"]
    settings = get_settings()
    expired = jwt.encode(
        {
            "sub": user_id,
            "type": "access",
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )

    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {expired}"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] in {"TOKEN_EXPIRED", "UNAUTHORIZED"}


@pytest.mark.asyncio
async def test_patch_users_me_timezone(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    response = await client.patch(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"timezone": "America/New_York"},
    )
    assert response.status_code == 200
    assert response.json()["timezone"] == "America/New_York"


@pytest.mark.asyncio
async def test_patch_users_me_invalid_timezone(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.patch(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"timezone": "Invalid/Zone"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_login_rate_limit(client: AsyncClient) -> None:
    payload = {"email": "ratelimit@example.com", "password": "whatever1"}
    last = None
    for _ in range(6):
        last = await client.post("/api/v1/auth/login", json=payload)

    assert last is not None
    assert last.status_code == 429
    assert last.json()["error"]["code"] == "RATE_LIMITED"
    assert "Retry-After" in last.headers
