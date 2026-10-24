"""Unit tests for goal version → day mapping."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from app.services.goal_service import map_versions_to_days


def _goal(effective_from: date, calories: int = 2000) -> SimpleNamespace:
    return SimpleNamespace(
        effective_from=effective_from,
        calories_kcal=calories,
        protein_g=Decimal("150"),
        carbs_g=Decimal("200"),
        fat_g=Decimal("60"),
    )


def test_map_versions_to_days_picks_correct_version() -> None:
    v1 = _goal(date(2026, 1, 1), 2000)
    v2 = _goal(date(2026, 1, 10), 1800)
    v3 = _goal(date(2026, 1, 20), 2200)

    mapped = map_versions_to_days([v1, v2, v3], date(2026, 1, 5), date(2026, 1, 25))

    assert mapped[date(2026, 1, 5)].calories_kcal == 2000
    assert mapped[date(2026, 1, 9)].calories_kcal == 2000
    assert mapped[date(2026, 1, 10)].calories_kcal == 1800
    assert mapped[date(2026, 1, 19)].calories_kcal == 1800
    assert mapped[date(2026, 1, 20)].calories_kcal == 2200
    assert mapped[date(2026, 1, 25)].calories_kcal == 2200


def test_map_versions_to_days_none_before_first_goal() -> None:
    v1 = _goal(date(2026, 1, 10), 2000)
    mapped = map_versions_to_days([v1], date(2026, 1, 1), date(2026, 1, 12))

    assert mapped[date(2026, 1, 1)] is None
    assert mapped[date(2026, 1, 9)] is None
    assert mapped[date(2026, 1, 10)].calories_kcal == 2000
    assert mapped[date(2026, 1, 12)].calories_kcal == 2000


def test_compute_weight_progress_clamped() -> None:
    from app.schemas.goal import compute_weight_progress

    # Loss goal: 80 → 70, current 65 (past target) → 100%
    past = compute_weight_progress(
        start_kg=Decimal("80"),
        current_kg=Decimal("65"),
        target_kg=Decimal("70"),
    )
    assert past.progress_pct == 100.0

    # Halfway
    mid = compute_weight_progress(
        start_kg=Decimal("80"),
        current_kg=Decimal("75"),
        target_kg=Decimal("70"),
    )
    assert mid.progress_pct == 50.0

    # Went the wrong way → 0%
    wrong = compute_weight_progress(
        start_kg=Decimal("80"),
        current_kg=Decimal("85"),
        target_kg=Decimal("70"),
    )
    assert wrong.progress_pct == 0.0
