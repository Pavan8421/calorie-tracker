"""Unit tests for PDF header mapping and table row shaping."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.integrations.pdf_parser import (
    has_required_mapped_columns,
    map_header,
    map_table_rows,
    normalize_header,
    parse_date_value,
    shape_row_for_validation,
)
from app.models.enums import MealType


def test_normalize_header_strips_units() -> None:
    assert normalize_header("Protein (g)") == "protein"
    assert map_header("Protein (g)") == "protein_g"
    assert map_header("Kcal") == "calories_kcal"
    assert map_header("Item") == "food_name"
    assert map_header("Sodium (mg)") == "sodium_mg"


def test_parse_date_dmy_vs_mdy() -> None:
    assert parse_date_value("03/04/2024", "DMY") == date(2024, 4, 3)
    assert parse_date_value("03/04/2024", "MDY") == date(2024, 3, 4)
    assert parse_date_value("2024-04-03", "DMY") == date(2024, 4, 3)


def test_map_table_standard_and_synonyms() -> None:
    tables = [
        [
            [
                ["Date", "Item", "Kcal", "Protein (g)"],
                ["01/02/2024", "Oatmeal", "350", "12"],
                ["01/02/2024", "Coffee", "5", "0"],
            ]
        ]
    ]
    rows = map_table_rows(tables, date_format="DMY")
    assert len(rows) == 2
    assert rows[0].raw["food_name"] == "Oatmeal"
    assert rows[0].raw["calories_kcal"] == Decimal("350")
    assert rows[0].raw["date"] == date(2024, 2, 1)
    assert has_required_mapped_columns(rows)


def test_map_table_header_carry_over_across_pages() -> None:
    tables = [
        [
            [
                ["Date", "Food", "Calories"],
                ["05/06/2024", "Rice", "200"],
            ]
        ],
        [
            [
                # continuation page — no header
                ["05/06/2024", "Beans", "150"],
            ]
        ],
    ]
    rows = map_table_rows(tables, date_format="DMY")
    assert len(rows) == 2
    assert rows[1].raw["food_name"] == "Beans"
    assert rows[1].raw["calories_kcal"] == Decimal("150")


def test_meal_from_section_heading_default_snacks() -> None:
    tables = [
        [
            [
                ["Date", "Food", "Calories", "Meal"],
                ["Breakfast"],
                ["10/01/2024", "Eggs", "140", ""],
                ["10/01/2024", "Apple", "80", ""],
            ]
        ]
    ]
    rows = map_table_rows(tables, date_format="DMY")
    assert len(rows) == 2
    assert rows[0].section_meal == MealType.breakfast
    shaped = shape_row_for_validation(rows[0], date_format="DMY")
    assert shaped["meal_type"] == MealType.breakfast

    # No section / meal → snacks
    tables2 = [
        [
            [
                ["Date", "Food", "Calories"],
                ["10/01/2024", "Nuts", "100"],
            ]
        ]
    ]
    rows2 = map_table_rows(tables2, date_format="DMY")
    shaped2 = shape_row_for_validation(rows2[0], date_format="DMY")
    assert shaped2["meal_type"] == MealType.snacks


def test_invalid_row_shape_missing_food_name_caught_later() -> None:
    tables = [
        [
            [
                ["Date", "Food", "Calories"],
                ["10/01/2024", "", "100"],
            ]
        ]
    ]
    rows = map_table_rows(tables, date_format="DMY")
    # Empty food name still extracted; validation happens in the worker
    assert rows[0].raw.get("food_name") in (None, "")
