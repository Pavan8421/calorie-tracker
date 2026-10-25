"""PDF table extraction, header mapping, and row shaping for food diary imports."""

from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import pdfplumber

from app.models.enums import MealType
from app.nutrients import NUTRIENT_BY_CODE

_UNIT_IN_PARENS = re.compile(r"\s*\([^)]*\)\s*")
_NON_ALNUM = re.compile(r"[^a-z0-9]+")

# Normalised header text → canonical field name
_HEADER_SYNONYMS: dict[str, str] = {
    "date": "date",
    "day": "date",
    "kcal": "calories_kcal",
    "calorie": "calories_kcal",
    "calories": "calories_kcal",
    "energy": "calories_kcal",
    "item": "food_name",
    "food": "food_name",
    "foodname": "food_name",
    "description": "food_name",
    "name": "food_name",
    "meal": "meal_type",
    "mealtype": "meal_type",
    "quantity": "quantity",
    "qty": "quantity",
    "amount": "quantity",
    "unit": "unit",
    "protein": "protein_g",
    "proteing": "protein_g",
    "carbs": "carbs_g",
    "carbohydrate": "carbs_g",
    "carbohydrates": "carbs_g",
    "carb": "carbs_g",
    "fat": "fat_g",
    "fats": "fat_g",
    "fiber": "fiber_g",
    "fibre": "fiber_g",
    "sugar": "sugar_g",
    "sugars": "sugar_g",
    "notes": "notes",
    "note": "notes",
}

# Micronutrient headers: strip unit suffix from code for matching
for _code in NUTRIENT_BY_CODE:
    _base = _code.rsplit("_", 1)[0]  # e.g. sodium_mg → sodium
    _HEADER_SYNONYMS[_base] = _code
    _HEADER_SYNONYMS[_code] = _code
    _HEADER_SYNONYMS[_code.replace("_", "")] = _code

_MEAL_SECTION_ALIASES: dict[str, MealType] = {
    "breakfast": MealType.breakfast,
    "lunch": MealType.lunch,
    "dinner": MealType.dinner,
    "snack": MealType.snacks,
    "snacks": MealType.snacks,
}

_REQUIRED_FIELDS = frozenset({"date", "food_name", "calories_kcal"})


@dataclass
class ExtractedRow:
    """One candidate diary row before schema validation."""

    raw: dict[str, Any] = field(default_factory=dict)
    section_meal: MealType | None = None


@dataclass
class ParseResult:
    rows: list[ExtractedRow]
    used_llm_fallback: bool = False
    error: str | None = None


def normalize_header(text: str | None) -> str:
    if text is None:
        return ""
    cleaned = _UNIT_IN_PARENS.sub(" ", str(text).strip().lower())
    cleaned = _NON_ALNUM.sub("", cleaned)
    return cleaned


def map_header(text: str | None) -> str | None:
    key = normalize_header(text)
    if not key:
        return None
    return _HEADER_SYNONYMS.get(key)


def count_pdf_pages(file_bytes: bytes) -> int:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return len(pdf.pages)


def parse_date_value(value: Any, date_format: str) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()

    text = str(value).strip()
    if not text:
        return None

    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            pass

    parts = re.split(r"[/\-.]", text)
    if len(parts) != 3:
        return None
    try:
        a, b, c = (int(p) for p in parts)
    except ValueError:
        return None

    if c >= 100:  # day/month/year or month/day/year
        year = c
        if date_format.upper() == "MDY":
            month, day = a, b
        else:
            day, month = a, b
    elif a >= 100:  # year first
        year, month, day = a, b, c
    else:
        return None

    try:
        return date(year, month, day)
    except ValueError:
        return None


def _parse_decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    if isinstance(value, Decimal):
        return value
    text = str(value).strip().replace(",", "")
    text = re.sub(r"[^\d.\-]", "", text)
    if not text or text in {".", "-", "-."}:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _infer_meal_from_text(text: str | None) -> MealType | None:
    if not text:
        return None
    key = normalize_header(text)
    for alias, meal in _MEAL_SECTION_ALIASES.items():
        if alias in key or key == alias:
            return meal
    # raw meal values
    lowered = str(text).strip().lower()
    try:
        return MealType(lowered)
    except ValueError:
        return None


def _row_looks_like_header(cells: list[Any]) -> bool:
    mapped = [map_header(c) for c in cells]
    hits = sum(1 for m in mapped if m is not None)
    return hits >= 2


def _is_section_heading_row(cells: list[Any]) -> MealType | None:
    non_empty = [str(c).strip() for c in cells if c is not None and str(c).strip()]
    if len(non_empty) != 1:
        return None
    return _infer_meal_from_text(non_empty[0])


def map_table_rows(
    tables: list[list[list[Any]]],
    *,
    date_format: str = "DMY",
) -> list[ExtractedRow]:
    """Map extracted tables (list of pages' tables of cell grids) to diary rows."""
    results: list[ExtractedRow] = []
    carried_headers: list[str | None] | None = None
    current_section_meal: MealType | None = None

    for page_tables in tables:
        for table in page_tables:
            if not table:
                continue
            start_idx = 0
            headers: list[str | None]

            if _row_looks_like_header(table[0]):
                headers = [map_header(c) for c in table[0]]
                carried_headers = headers
                start_idx = 1
            elif carried_headers is not None:
                headers = carried_headers
            else:
                # No header yet — skip until we find one
                if len(table) > 1 and _row_looks_like_header(table[0]):
                    headers = [map_header(c) for c in table[0]]
                    carried_headers = headers
                    start_idx = 1
                else:
                    continue

            for row in table[start_idx:]:
                if not row or all(c is None or str(c).strip() == "" for c in row):
                    continue

                section = _is_section_heading_row(row)
                if section is not None:
                    current_section_meal = section
                    continue

                raw: dict[str, Any] = {}
                micros: dict[str, float] = {}
                for idx, cell in enumerate(row):
                    if idx >= len(headers):
                        break
                    field_name = headers[idx]
                    if field_name is None:
                        continue
                    if field_name in NUTRIENT_BY_CODE:
                        amount = _parse_decimal(cell)
                        if amount is not None:
                            micros[field_name] = float(amount)
                        continue
                    if field_name == "date":
                        raw["date"] = parse_date_value(cell, date_format)
                    elif field_name == "meal_type":
                        raw["meal_type"] = _infer_meal_from_text(str(cell) if cell else None)
                    elif field_name in {
                        "calories_kcal",
                        "protein_g",
                        "carbs_g",
                        "fat_g",
                        "fiber_g",
                        "sugar_g",
                        "quantity",
                    }:
                        raw[field_name] = _parse_decimal(cell)
                    elif field_name == "food_name":
                        raw["food_name"] = str(cell).strip() if cell is not None else None
                    elif field_name == "unit":
                        raw["unit"] = str(cell).strip().lower() if cell is not None else None
                    elif field_name == "notes":
                        raw["notes"] = str(cell).strip() if cell is not None else None

                if micros:
                    raw["micronutrients"] = micros

                if not raw.get("food_name") and raw.get("calories_kcal") is None:
                    continue

                results.append(
                    ExtractedRow(raw=raw, section_meal=current_section_meal)
                )

    return results


def extract_tables_from_pdf(file_bytes: bytes) -> list[list[list[list[Any]]]]:
    """Return tables per page: pages → tables → rows → cells."""
    pages_out: list[list[list[list[Any]]]] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables() or []
            pages_out.append(page_tables)
    return pages_out


def extract_text_from_pdf(file_bytes: bytes) -> str:
    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if text.strip():
                parts.append(text)
    return "\n\n".join(parts)


def has_required_mapped_columns(rows: list[ExtractedRow]) -> bool:
    if not rows:
        return False
    # Consider required columns present if any row has all three after mapping
    for row in rows:
        if (
            row.raw.get("date") is not None
            and row.raw.get("food_name")
            and row.raw.get("calories_kcal") is not None
        ):
            return True
    # Or if headers mapped those fields even if values missing on first rows
    keys: set[str] = set()
    for row in rows:
        keys.update(row.raw.keys())
    return _REQUIRED_FIELDS.issubset(keys)


def shape_row_for_validation(
    extracted: ExtractedRow,
    *,
    date_format: str = "DMY",
) -> dict[str, Any]:
    """Build a dict suitable for FoodEntryCreate (+ diary date for consumed_at)."""
    raw = dict(extracted.raw)
    meal = raw.get("meal_type") or extracted.section_meal or MealType.snacks
    if isinstance(meal, str):
        meal = _infer_meal_from_text(meal) or MealType.snacks

    diary_date = raw.get("date")
    if isinstance(diary_date, str):
        diary_date = parse_date_value(diary_date, date_format)

    payload: dict[str, Any] = {
        "meal_type": meal if isinstance(meal, MealType) else MealType.snacks,
        "food_name": (raw.get("food_name") or "").strip() or "Unknown",
        "quantity": raw.get("quantity") if raw.get("quantity") is not None else Decimal("1"),
        "unit": raw.get("unit") if raw.get("unit") in {
            "g", "ml", "piece", "serving", "cup", "tbsp", "tsp"
        } else "serving",
        "calories_kcal": raw.get("calories_kcal")
        if raw.get("calories_kcal") is not None
        else Decimal("0"),
        "protein_g": raw.get("protein_g") if raw.get("protein_g") is not None else Decimal("0"),
        "carbs_g": raw.get("carbs_g") if raw.get("carbs_g") is not None else Decimal("0"),
        "fat_g": raw.get("fat_g") if raw.get("fat_g") is not None else Decimal("0"),
        "fiber_g": raw.get("fiber_g"),
        "sugar_g": raw.get("sugar_g"),
        "micronutrients": raw.get("micronutrients") or {},
        "notes": raw.get("notes"),
        "source": "manual",
        "_diary_date": diary_date,
    }
    return payload


def parse_pdf_tables(file_bytes: bytes, *, date_format: str = "DMY") -> ParseResult:
    tables = extract_tables_from_pdf(file_bytes)
    flat_pages = tables
    rows = map_table_rows(flat_pages, date_format=date_format)
    if not rows or not has_required_mapped_columns(rows):
        return ParseResult(rows=rows, used_llm_fallback=False)
    return ParseResult(rows=rows, used_llm_fallback=False)
