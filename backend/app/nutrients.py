"""Micronutrient registry — single source of truth for codes, units, and daily values."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class NutrientDef:
    code: str
    name: str
    unit: str
    daily_value: float | None


NUTRIENTS: tuple[NutrientDef, ...] = (
    NutrientDef("vitamin_a_mcg", "Vitamin A", "mcg", 900),
    NutrientDef("vitamin_c_mg", "Vitamin C", "mg", 90),
    NutrientDef("vitamin_d_mcg", "Vitamin D", "mcg", 20),
    NutrientDef("vitamin_e_mg", "Vitamin E", "mg", 15),
    NutrientDef("vitamin_k_mcg", "Vitamin K", "mcg", 120),
    NutrientDef("vitamin_b6_mg", "Vitamin B6", "mg", 1.7),
    NutrientDef("vitamin_b12_mcg", "Vitamin B12", "mcg", 2.4),
    NutrientDef("folate_mcg", "Folate", "mcg", 400),
    NutrientDef("calcium_mg", "Calcium", "mg", 1300),
    NutrientDef("iron_mg", "Iron", "mg", 18),
    NutrientDef("magnesium_mg", "Magnesium", "mg", 420),
    NutrientDef("potassium_mg", "Potassium", "mg", 4700),
    NutrientDef("sodium_mg", "Sodium", "mg", 2300),
    NutrientDef("zinc_mg", "Zinc", "mg", 11),
    NutrientDef("cholesterol_mg", "Cholesterol", "mg", 300),
)

NUTRIENT_BY_CODE: dict[str, NutrientDef] = {n.code: n for n in NUTRIENTS}

ALLOWED_UNITS: frozenset[str] = frozenset(
    {"g", "ml", "piece", "serving", "cup", "tbsp", "tsp"}
)

CLIENT_ALLOWED_SOURCES: frozenset[str] = frozenset({"manual", "ai_image"})


def is_known_nutrient(code: str) -> bool:
    return code in NUTRIENT_BY_CODE
