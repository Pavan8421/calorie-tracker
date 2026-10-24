"""Phase 2 weight log API tests."""

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
        "target_weight_kg": "70",
        "target_date": (date.today() + timedelta(days=90)).isoformat(),
    }
    data.update(overrides)
    return data


@pytest.mark.asyncio
async def test_weight_log_same_day_upsert(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    first = await client.post(
        "/api/v1/weight-logs",
        headers=auth_headers,
        json={"weight_kg": "80.5"},
    )
    assert first.status_code == 201
    first_id = first.json()["id"]
    logged_on = first.json()["logged_on"]

    second = await client.post(
        "/api/v1/weight-logs",
        headers=auth_headers,
        json={"weight_kg": "79.0", "logged_on": logged_on},
    )
    assert second.status_code == 201
    assert second.json()["id"] == first_id
    assert Decimal(second.json()["weight_kg"]) == Decimal("79.0")

    listed = await client.get("/api/v1/weight-logs", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1


@pytest.mark.asyncio
async def test_weight_progress_on_current_goal(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    goal = await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal_payload(target_weight_kg="70"),
    )
    assert goal.status_code == 201
    effective = goal.json()["effective_from"]

    await client.post(
        "/api/v1/weight-logs",
        headers=auth_headers,
        json={"weight_kg": "80", "logged_on": effective},
    )
    later = (date.fromisoformat(effective) + timedelta(days=1)).isoformat()
    await client.post(
        "/api/v1/weight-logs",
        headers=auth_headers,
        json={"weight_kg": "75", "logged_on": later},
    )

    current = await client.get("/api/v1/goals/current", headers=auth_headers)
    assert current.status_code == 200
    progress = current.json()["weight_progress"]
    assert progress is not None
    assert Decimal(progress["start_kg"]) == Decimal("80")
    assert Decimal(progress["current_kg"]) == Decimal("75")
    assert Decimal(progress["target_kg"]) == Decimal("70")
    assert progress["progress_pct"] == 50.0


@pytest.mark.asyncio
async def test_delete_weight_log(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await client.post(
        "/api/v1/weight-logs",
        headers=auth_headers,
        json={"weight_kg": "82"},
    )
    log_id = created.json()["id"]

    deleted = await client.delete(f"/api/v1/weight-logs/{log_id}", headers=auth_headers)
    assert deleted.status_code == 204

    listed = await client.get("/api/v1/weight-logs", headers=auth_headers)
    assert listed.json()["total"] == 0


@pytest.mark.asyncio
async def test_weight_log_isolation_other_user(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await client.post(
        "/api/v1/weight-logs",
        headers=auth_headers,
        json={"weight_kg": "80"},
    )
    log_id = created.json()["id"]

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "carol@example.com",
            "password": "Secret123",
            "full_name": "Carol",
            "timezone": "UTC",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "carol@example.com", "password": "Secret123"},
    )
    carol_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = await client.delete(
        f"/api/v1/weight-logs/{log_id}",
        headers=carol_headers,
    )
    assert response.status_code == 404
