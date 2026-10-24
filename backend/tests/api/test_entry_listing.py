"""Phase 4 time-range entry listing API tests."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from httpx import AsyncClient


def _entry_payload(**overrides: object) -> dict:
    data: dict = {
        "meal_type": "breakfast",
        "food_name": "Oatmeal",
        "quantity": "1",
        "unit": "serving",
        "calories_kcal": "350",
        "protein_g": "12",
        "carbs_g": "54",
        "fat_g": "8",
        "source": "manual",
    }
    data.update(overrides)
    return data


async def _create(
    client: AsyncClient,
    headers: dict[str, str],
    **overrides: object,
) -> dict:
    response = await client.post(
        "/api/v1/entries",
        headers=headers,
        json=_entry_payload(**overrides),
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_list_default_range_excludes_outside(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    today = date.today()
    inside = await _create(
        client,
        auth_headers,
        food_name="Inside",
        consumed_at=f"{today.isoformat()}T08:00:00+05:30",
    )
    outside_day = today - timedelta(days=20)
    await _create(
        client,
        auth_headers,
        food_name="Outside",
        consumed_at=f"{outside_day.isoformat()}T08:00:00+05:30",
    )

    response = await client.get("/api/v1/entries", headers=auth_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    names = {item["food_name"] for item in body["items"]}
    assert "Inside" in names
    assert "Outside" not in names
    assert inside["id"] in {item["id"] for item in body["items"]}


@pytest.mark.asyncio
async def test_list_date_range_includes_boundaries(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    start = date(2024, 6, 1)
    end = date(2024, 6, 3)
    await _create(
        client,
        auth_headers,
        food_name="StartDay",
        consumed_at="2024-06-01T02:00:00+05:30",
    )
    await _create(
        client,
        auth_headers,
        food_name="EndDay",
        consumed_at="2024-06-03T22:00:00+05:30",
    )
    await _create(
        client,
        auth_headers,
        food_name="Before",
        consumed_at="2024-05-31T12:00:00+05:30",
    )
    await _create(
        client,
        auth_headers,
        food_name="After",
        consumed_at="2024-06-04T12:00:00+05:30",
    )

    response = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params={"start_date": start.isoformat(), "end_date": end.isoformat()},
    )
    assert response.status_code == 200
    names = {item["food_name"] for item in response.json()["items"]}
    assert names == {"StartDay", "EndDay"}


@pytest.mark.asyncio
async def test_list_single_and_multiple_meal_types(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    day = "2024-07-10"
    await _create(
        client,
        auth_headers,
        food_name="Bfast",
        meal_type="breakfast",
        consumed_at=f"{day}T08:00:00+05:30",
    )
    await _create(
        client,
        auth_headers,
        food_name="Lunch",
        meal_type="lunch",
        consumed_at=f"{day}T13:00:00+05:30",
    )
    await _create(
        client,
        auth_headers,
        food_name="Dinner",
        meal_type="dinner",
        consumed_at=f"{day}T20:00:00+05:30",
    )

    single = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params={"start_date": day, "end_date": day, "meal_type": "lunch"},
    )
    assert single.status_code == 200
    assert {i["food_name"] for i in single.json()["items"]} == {"Lunch"}

    multi = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params=[
            ("start_date", day),
            ("end_date", day),
            ("meal_type", "breakfast"),
            ("meal_type", "dinner"),
        ],
    )
    assert multi.status_code == 200
    assert {i["food_name"] for i in multi.json()["items"]} == {"Bfast", "Dinner"}


@pytest.mark.asyncio
async def test_list_invalid_date_range(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params={"start_date": "2024-06-10", "end_date": "2024-06-01"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_DATE_RANGE"


@pytest.mark.asyncio
async def test_list_range_over_366_days(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params={"start_date": "2024-01-01", "end_date": "2025-01-03"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_DATE_RANGE"


@pytest.mark.asyncio
async def test_list_pagination_stable_order(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    day = "2024-08-01"
    created_ids: list[str] = []
    for i in range(5):
        entry = await _create(
            client,
            auth_headers,
            food_name=f"Item{i}",
            consumed_at=f"{day}T{10 + i:02d}:00:00+05:30",
        )
        created_ids.append(entry["id"])

    page1 = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params={
            "start_date": day,
            "end_date": day,
            "page": 1,
            "page_size": 2,
        },
    )
    page2 = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params={
            "start_date": day,
            "end_date": day,
            "page": 2,
            "page_size": 2,
        },
    )
    assert page1.status_code == 200
    assert page2.status_code == 200
    body1 = page1.json()
    body2 = page2.json()
    assert body1["total"] == 5
    assert body1["total_pages"] == 3
    assert body1["page"] == 1
    assert body1["page_size"] == 2

    ids1 = [item["id"] for item in body1["items"]]
    ids2 = [item["id"] for item in body2["items"]]
    assert len(ids1) == 2
    assert len(ids2) == 2
    assert set(ids1).isdisjoint(ids2)
    # Newest first: Item4 then Item3 on page 1
    assert body1["items"][0]["food_name"] == "Item4"
    assert body1["items"][1]["food_name"] == "Item3"


@pytest.mark.asyncio
async def test_list_timezone_boundary_local_date(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    # 18:30 UTC = 00:00 next day Asia/Kolkata → consumed_on is June 2
    entry = await _create(
        client,
        auth_headers,
        food_name="MidnightCrossing",
        consumed_at="2024-06-01T18:30:00Z",
    )
    assert entry["consumed_on"] == "2024-06-02"

    on_june1 = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params={"start_date": "2024-06-01", "end_date": "2024-06-01"},
    )
    assert entry["id"] not in {i["id"] for i in on_june1.json()["items"]}

    on_june2 = await client.get(
        "/api/v1/entries",
        headers=auth_headers,
        params={"start_date": "2024-06-02", "end_date": "2024-06-02"},
    )
    assert entry["id"] in {i["id"] for i in on_june2.json()["items"]}


@pytest.mark.asyncio
async def test_list_isolation_other_user(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    day = "2024-09-01"
    mine = await _create(
        client,
        auth_headers,
        food_name="AliceMeal",
        consumed_at=f"{day}T12:00:00+05:30",
    )

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dave@example.com",
            "password": "Secret123",
            "full_name": "Dave",
            "timezone": "UTC",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dave@example.com", "password": "Secret123"},
    )
    dave_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = await client.get(
        "/api/v1/entries",
        headers=dave_headers,
        params={"start_date": day, "end_date": day},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert mine["id"] not in {i["id"] for i in response.json()["items"]}
