"""Unit tests for report helper calculations."""

from __future__ import annotations

from decimal import Decimal

from app.services.report_service import macro_calorie_share, micronutrient_status


def test_macro_calorie_share_percentages() -> None:
    # 25g protein=100, 50g carbs=200, ~11.11g fat=100 → 25% / 50% / 25%
    share = macro_calorie_share(Decimal("25"), Decimal("50"), Decimal("100") / 9)
    assert share.protein_pct == 25.0
    assert share.carbs_pct == 50.0
    assert share.fat_pct == 25.0


def test_macro_calorie_share_zero_total() -> None:
    share = macro_calorie_share(Decimal("0"), Decimal("0"), Decimal("0"))
    assert share.protein_pct == 0.0
    assert share.carbs_pct == 0.0
    assert share.fat_pct == 0.0


def test_micronutrient_status_thresholds() -> None:
    assert micronutrient_status(49.9) == "low"
    assert micronutrient_status(50) == "adequate"
    assert micronutrient_status(150) == "adequate"
    assert micronutrient_status(150.1) == "high"
    assert micronutrient_status(None) is None
