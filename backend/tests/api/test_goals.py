"""Phase 2 goals API tests."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient


def _goal_payload(**overrides: object) -> dict:
    data: dict = {
        "calories_kcal": 2000,
        "protein_g": "150",
        "carbs_g": "200",
        "fat_g": "60",
        "fiber_g": "30",
        "target_weight_kg": "70",
        "target_date": (date.today() + timedelta(days=90)).isoformat(),
    }
    data.update(overrides)
    return data


@pytest.mark.asyncio
async def test_get_current_goal_not_set(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.get("/api/v1/goals/current", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "GOAL_NOT_SET"


@pytest.mark.asyncio
async def test_create_and_get_current_goal(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    create = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(),
    )
    assert create.status_code == 201
    body = create.json()
    assert body["calories_kcal"] == 2000
    assert Decimal(body["protein_g"]) == Decimal("150")
    assert body["warnings"] == []

    current = await client.get("/api/v1/goals/current", headers=auth_headers)
    assert current.status_code == 200
    assert current.json()["id"] == body["id"]
    assert current.json()["effective_from"] == body["effective_from"]


@pytest.mark.asyncio
async def test_same_day_goal_upsert(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    first = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(calories_kcal=2000),
    )
    assert first.status_code == 201
    first_id = first.json()["id"]
    effective = first.json()["effective_from"]

    second = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(calories_kcal=1800, effective_from=effective),
    )
    assert second.status_code == 201
    assert second.json()["id"] == first_id
    assert second.json()["calories_kcal"] == 1800

    listed = await client.get("/api/v1/goals", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1


@pytest.mark.asyncio
async def test_current_goal_ignores_future_version(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    today_resp = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(calories_kcal=2000),
    )
    assert today_resp.status_code == 201
    today_id = today_resp.json()["id"]
    today = date.fromisoformat(today_resp.json()["effective_from"])

    future = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(
            calories_kcal=1500,
            effective_from=(today + timedelta(days=7)).isoformat(),
        ),
    )
    assert future.status_code == 201

    current = await client.get("/api/v1/goals/current", headers=auth_headers)
    assert current.status_code == 200
    assert current.json()["id"] == today_id
    assert current.json()["calories_kcal"] == 2000


@pytest.mark.asyncio
async def test_macro_mismatch_warning(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    # Macros imply ~400 kcal but calories_kcal is 2000 → >15% mismatch
    response = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(
            calories_kcal=2000,
            protein_g="25",
            carbs_g="25",
            fat_g="20",
        ),
    )
    assert response.status_code == 201
    assert len(response.json()["warnings"]) == 1


@pytest.mark.asyncio
async def test_create_goal_out_of_range_calories(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(calories_kcal=500),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_create_goal_past_target_date(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(target_date=(date.today() - timedelta(days=1)).isoformat()),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_TARGET_DATE"


@pytest.mark.asyncio
async def test_patch_and_delete_goal(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(),
    )
    goal_id = created.json()["id"]

    patched = await client.patch(
        f"/api/v1/goals/{goal_id}",
        headers=auth_headers,
        json={"calories_kcal": 2100},
    )
    assert patched.status_code == 200
    assert patched.json()["calories_kcal"] == 2100

    deleted = await client.delete(f"/api/v1/goals/{goal_id}", headers=auth_headers)
    assert deleted.status_code == 204

    current = await client.get("/api/v1/goals/current", headers=auth_headers)
    assert current.status_code == 404


@pytest.mark.asyncio
async def test_goal_isolation_other_user(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(),
    )
    goal_id = created.json()["id"]

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "bob@example.com",
            "password": "Secret123",
            "full_name": "Bob",
            "timezone": "UTC",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "bob@example.com", "password": "Secret123"},
    )
    bob_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = await client.patch(
        f"/api/v1/goals/{goal_id}",
        headers=bob_headers,
        json={"calories_kcal": 2500},
    )
    assert response.status_code == 404
