"""Phase 5 reports API tests."""

from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient


def _entry(**overrides: object) -> dict:
    data: dict = {
        "meal_type": "lunch",
        "food_name": "Rice",
        "quantity": "1",
        "unit": "serving",
        "calories_kcal": "500",
        "protein_g": "10",
        "carbs_g": "80",
        "fat_g": "5",
        "source": "manual",
    }
    data.update(overrides)
    return data


def _goal(**overrides: object) -> dict:
    data: dict = {
        "calories_kcal": 2000,
        "protein_g": "150",
        "carbs_g": "200",
        "fat_g": "60",
        "effective_from": "2024-06-01",
    }
    data.update(overrides)
    return data


async def _post_entry(
    client: AsyncClient, headers: dict[str, str], **overrides: object
) -> dict:
    response = await client.post(
        "/api/v1/entries", headers=headers, json=_entry(**overrides)
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_calorie_trend_zero_fills_days(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal(effective_from="2024-06-01", calories_kcal=2000),
    )
    await _post_entry(
        client,
        auth_headers,
        food_name="OnlyMid",
        calories_kcal="400",
        consumed_at="2024-06-02T12:00:00+05:30",
    )

    response = await client.get(
        "/api/v1/reports/calorie-trend",
        headers=auth_headers,
        params={"start_date": "2024-06-01", "end_date": "2024-06-03"},
    )
    assert response.status_code == 200, response.text
    points = response.json()["points"]
    assert len(points) == 3
    assert points[0]["day"] == "2024-06-01"
    assert Decimal(points[0]["calories"]) == Decimal("0")
    assert points[0]["goal_calories"] == 2000
    assert points[1]["day"] == "2024-06-02"
    assert Decimal(points[1]["calories"]) == Decimal("400")
    assert points[2]["day"] == "2024-06-03"
    assert Decimal(points[2]["calories"]) == Decimal("0")


@pytest.mark.asyncio
async def test_macros_weekly_monday_start(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    # 2024-06-05 is Wednesday; week Monday is 2024-06-03
    await _post_entry(
        client,
        auth_headers,
        protein_g="20",
        carbs_g="30",
        fat_g="10",
        consumed_at="2024-06-05T12:00:00+05:30",
    )
    await _post_entry(
        client,
        auth_headers,
        food_name="Thu",
        protein_g="10",
        carbs_g="20",
        fat_g="5",
        consumed_at="2024-06-06T12:00:00+05:30",
    )

    response = await client.get(
        "/api/v1/reports/macros",
        headers=auth_headers,
        params={
            "start_date": "2024-06-05",
            "end_date": "2024-06-06",
            "group_by": "week",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["group_by"] == "week"
    assert len(body["points"]) == 1
    assert body["points"][0]["period_start"] == "2024-06-03"
    assert Decimal(body["points"][0]["protein_g"]) == Decimal("30")
    assert Decimal(body["points"][0]["carbs_g"]) == Decimal("50")
    assert Decimal(body["points"][0]["fat_g"]) == Decimal("15")
    # 30*4 + 50*4 + 15*9 = 120+200+135 = 455
    share = body["calorie_share"]
    assert share["protein_pct"] == round(120 / 455 * 100, 1)
    assert share["carbs_pct"] == round(200 / 455 * 100, 1)
    assert share["fat_pct"] == round(135 / 455 * 100, 1)


@pytest.mark.asyncio
async def test_micronutrient_daily_average_and_status(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    # vitamin_c DV = 90; total 180 over 2 days → avg 90 → 100% adequate
    await _post_entry(
        client,
        auth_headers,
        micronutrients={"vitamin_c_mg": 180},
        consumed_at="2024-06-01T12:00:00+05:30",
    )

    response = await client.get(
        "/api/v1/reports/micronutrients",
        headers=auth_headers,
        params={"start_date": "2024-06-01", "end_date": "2024-06-02"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["days_in_range"] == 2
    vit_c = next(n for n in body["nutrients"] if n["code"] == "vitamin_c_mg")
    assert Decimal(vit_c["total"]) == Decimal("180")
    assert Decimal(vit_c["daily_average"]) == Decimal("90.00")
    assert vit_c["percent_daily_value"] == 100.0
    assert vit_c["status"] == "adequate"


@pytest.mark.asyncio
async def test_goal_comparison_uses_version_per_day(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal(effective_from="2024-06-01", calories_kcal=2000),
    )
    await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal(effective_from="2024-06-03", calories_kcal=1500),
    )
    await _post_entry(
        client,
        auth_headers,
        calories_kcal="2000",
        consumed_at="2024-06-01T12:00:00+05:30",
    )
    await _post_entry(
        client,
        auth_headers,
        food_name="Day3",
        calories_kcal="1500",
        consumed_at="2024-06-03T12:00:00+05:30",
    )

    response = await client.get(
        "/api/v1/reports/goal-comparison",
        headers=auth_headers,
        params={"start_date": "2024-06-01", "end_date": "2024-06-03"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    days = {d["day"]: d for d in body["days"]}
    assert days["2024-06-01"]["goal"]["calories_kcal"] == 2000
    assert days["2024-06-02"]["goal"]["calories_kcal"] == 2000
    assert days["2024-06-03"]["goal"]["calories_kcal"] == 1500
    # Both entry days within ±10%; middle day 0 vs 2000 is not within
    assert body["summary"]["days_with_goal"] == 3
    assert body["summary"]["days_within_10_pct"] == 2
    assert body["summary"]["adherence_pct"] == round(2 / 3 * 100, 1)


@pytest.mark.asyncio
async def test_goal_comparison_excludes_days_without_goal_from_adherence(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal(effective_from="2024-06-05", calories_kcal=2000),
    )
    await _post_entry(
        client,
        auth_headers,
        calories_kcal="2000",
        consumed_at="2024-06-01T12:00:00+05:30",
    )
    await _post_entry(
        client,
        auth_headers,
        food_name="WithGoal",
        calories_kcal="2000",
        consumed_at="2024-06-05T12:00:00+05:30",
    )

    response = await client.get(
        "/api/v1/reports/goal-comparison",
        headers=auth_headers,
        params={"start_date": "2024-06-01", "end_date": "2024-06-05"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["days"][0]["goal"] is None
    assert body["summary"]["days_with_goal"] == 1
    assert body["summary"]["days_within_10_pct"] == 1
    assert body["summary"]["adherence_pct"] == 100.0


@pytest.mark.asyncio
async def test_report_range_over_92_days(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.get(
        "/api/v1/reports/calorie-trend",
        headers=auth_headers,
        params={"start_date": "2024-01-01", "end_date": "2024-04-05"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_DATE_RANGE"


@pytest.mark.asyncio
async def test_invalid_group_by(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.get(
        "/api/v1/reports/macros",
        headers=auth_headers,
        params={
            "start_date": "2024-06-01",
            "end_date": "2024-06-07",
            "group_by": "month",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_daily_summary_and_isolation(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    await client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json=_goal(effective_from="2024-06-10", calories_kcal=2000),
    )
    await _post_entry(
        client,
        auth_headers,
        meal_type="breakfast",
        calories_kcal="300",
        protein_g="20",
        carbs_g="40",
        fat_g="5",
        consumed_at="2024-06-10T08:00:00+05:30",
    )
    await _post_entry(
        client,
        auth_headers,
        meal_type="dinner",
        food_name="Dinner",
        calories_kcal="700",
        protein_g="40",
        carbs_g="60",
        fat_g="20",
        consumed_at="2024-06-10T20:00:00+05:30",
    )

    summary = await client.get(
        "/api/v1/reports/daily-summary",
        headers=auth_headers,
        params={"date": "2024-06-10"},
    )
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert Decimal(body["totals"]["calories_kcal"]) == Decimal("1000")
    assert len(body["by_meal"]) == 2
    assert body["goal"]["calories_kcal"] == 2000
    assert Decimal(body["remaining"]["calories_kcal"]) == Decimal("1000")

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "eve@example.com",
            "password": "Secret123",
            "full_name": "Eve",
            "timezone": "UTC",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "eve@example.com", "password": "Secret123"},
    )
    eve = {"Authorization": f"Bearer {login.json()['access_token']}"}

    other = await client.get(
        "/api/v1/reports/daily-summary",
        headers=eve,
        params={"date": "2024-06-10"},
    )
    assert other.status_code == 200
    assert Decimal(other.json()["totals"]["calories_kcal"]) == Decimal("0")
    assert other.json()["by_meal"] == []


@pytest.mark.asyncio
async def test_report_start_after_end(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    response = await client.get(
        "/api/v1/reports/macros",
        headers=auth_headers,
        params={"start_date": "2024-06-10", "end_date": "2024-06-01"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_DATE_RANGE"
