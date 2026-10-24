"""Phase 3 food entry API tests."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

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
        "fiber_g": "6",
        "micronutrients": {"vitamin_c_mg": 5, "iron_mg": 2.5},
        "source": "manual",
    }
    data.update(overrides)
    return data


@pytest.mark.asyncio
async def test_list_nutrients(client: AsyncClient) -> None:
    response = await client.get("/api/v1/nutrients")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 10
    codes = {item["code"] for item in body}
    assert "vitamin_c_mg" in codes
    assert "iron_mg" in codes
    sample = next(item for item in body if item["code"] == "vitamin_c_mg")
    assert sample["unit"] == "mg"
    assert sample["name"] == "Vitamin C"


@pytest.mark.asyncio
async def test_create_entry_success(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["food_name"] == "Oatmeal"
    assert body["meal_type"] == "breakfast"
    assert body["source"] == "manual"
    assert Decimal(body["calories_kcal"]) == Decimal("350")
    assert body["micronutrients"]["vitamin_c_mg"] == 5
    assert "consumed_on" in body
    assert "id" in body


@pytest.mark.asyncio
async def test_consumed_on_uses_user_timezone(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    # 18:00 UTC = 23:30 Asia/Kolkata — same local calendar day
    consumed_at = "2024-06-01T18:00:00Z"
    response = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(consumed_at=consumed_at),
    )
    assert response.status_code == 201, response.text
    assert response.json()["consumed_on"] == "2024-06-01"


@pytest.mark.asyncio
async def test_future_consumed_at_rejected(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    future = (datetime.now(UTC) + timedelta(hours=1)).isoformat()
    response = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(consumed_at=future),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_non_positive_quantity_rejected(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(quantity="0"),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_negative_macros_rejected(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(protein_g="-1"),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_unknown_micronutrient_key(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(micronutrients={"not_a_real_nutrient": 1}),
    )
    assert response.status_code == 422
    detail_messages = " ".join(
        d["message"] for d in response.json()["error"]["details"] if d.get("message")
    )
    assert "not_a_real_nutrient" in detail_messages


@pytest.mark.asyncio
async def test_negative_micronutrient_value(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(micronutrients={"vitamin_c_mg": -1}),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_client_cannot_set_chat_source(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(source="chat"),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_client_cannot_set_pdf_import_source(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(source="pdf_import"),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_update_delete_entry(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(),
    )
    assert created.status_code == 201
    entry_id = created.json()["id"]

    fetched = await client.get(f"/api/v1/entries/{entry_id}", headers=auth_headers)
    assert fetched.status_code == 200
    assert fetched.json()["id"] == entry_id

    # 19:00 UTC = 00:30 IST next day
    updated = await client.patch(
        f"/api/v1/entries/{entry_id}",
        headers=auth_headers,
        json={
            "food_name": "Oats with fruit",
            "consumed_at": "2024-06-01T19:00:00Z",
            "calories_kcal": "400",
        },
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["food_name"] == "Oats with fruit"
    assert body["consumed_on"] == "2024-06-02"
    assert Decimal(body["calories_kcal"]) == Decimal("400")

    deleted = await client.delete(f"/api/v1/entries/{entry_id}", headers=auth_headers)
    assert deleted.status_code == 204

    missing = await client.get(f"/api/v1/entries/{entry_id}", headers=auth_headers)
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "ENTRY_NOT_FOUND"


@pytest.mark.asyncio
async def test_recent_foods_distinct_case_insensitive(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    older = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(
            food_name="Banana",
            calories_kcal="90",
            consumed_at="2024-05-01T08:00:00Z",
        ),
    )
    assert older.status_code == 201

    newer = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(
            food_name="banana",
            calories_kcal="95",
            consumed_at="2024-05-02T08:00:00Z",
        ),
    )
    assert newer.status_code == 201

    other = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json=_entry_payload(
            food_name="Apple",
            calories_kcal="80",
            consumed_at="2024-05-03T08:00:00Z",
        ),
    )
    assert other.status_code == 201

    recent = await client.get("/api/v1/entries/recent", headers=auth_headers)
    assert recent.status_code == 200
    body = recent.json()
    names = [item["food_name"].lower() for item in body["items"]]
    assert names.count("banana") == 1
    assert "apple" in names
    banana = next(item for item in body["items"] if item["food_name"].lower() == "banana")
    assert Decimal(banana["calories_kcal"]) == Decimal("95")
    assert body["items"][0]["food_name"].lower() == "apple"


@pytest.mark.asyncio
async def test_entry_isolation_between_users(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@example.com",
            "password": "Secret123",
            "full_name": "Owner",
            "timezone": "UTC",
        },
    )
    owner_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "Secret123"},
    )
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['access_token']}"}

    created = await client.post(
        "/api/v1/entries",
        headers=owner_headers,
        json=_entry_payload(),
    )
    assert created.status_code == 201
    entry_id = created.json()["id"]

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "other@example.com",
            "password": "Secret123",
            "full_name": "Other",
            "timezone": "UTC",
        },
    )
    other_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "other@example.com", "password": "Secret123"},
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    assert (
        await client.get(f"/api/v1/entries/{entry_id}", headers=other_headers)
    ).status_code == 404
    assert (
        await client.patch(
            f"/api/v1/entries/{entry_id}",
            headers=other_headers,
            json={"food_name": "Hacked"},
        )
    ).status_code == 404
    assert (
        await client.delete(f"/api/v1/entries/{entry_id}", headers=other_headers)
    ).status_code == 404
