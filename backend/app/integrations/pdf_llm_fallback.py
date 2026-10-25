"""LangChain structured-output fallback when PDF tables cannot be mapped."""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal
from typing import Any, Literal

from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from app.integrations.llm import get_chat_model
from app.integrations.pdf_parser import ExtractedRow
from app.models.enums import MealType
from app.nutrients import NUTRIENTS

logger = logging.getLogger(__name__)

_NUTRIENT_CODES = ", ".join(n.code for n in NUTRIENTS)


class LlmImportMicro(BaseModel):
    code: str
    amount: float = Field(ge=0)


class LlmImportRow(BaseModel):
    diary_date: date
    meal_type: MealType = MealType.snacks
    food_name: str
    quantity: float = Field(default=1, gt=0)
    unit: Literal["g", "ml", "piece", "serving", "cup", "tbsp", "tsp"] = "serving"
    calories_kcal: float = Field(ge=0)
    protein_g: float = Field(default=0, ge=0)
    carbs_g: float = Field(default=0, ge=0)
    fat_g: float = Field(default=0, ge=0)
    fiber_g: float | None = None
    sugar_g: float | None = None
    micronutrients: list[LlmImportMicro] = Field(default_factory=list)
    notes: str | None = None


class LlmImportResult(BaseModel):
    rows: list[LlmImportRow] = Field(default_factory=list)


_PROMPT = f"""
You extract food diary rows from messy PDF text for a calorie tracker.
Return structured rows only. Use meal_type one of: breakfast, lunch, dinner, snacks.
Units: g, ml, piece, serving, cup, tbsp, tsp.
Micronutrient codes (optional): {_NUTRIENT_CODES}.
Prefer day-first dates when ambiguous unless the text clearly uses month-first.
Skip headers and totals. If nothing edible is found, return an empty rows list.
""".strip()


def _to_extracted(row: LlmImportRow) -> ExtractedRow:
    micros = {m.code: m.amount for m in row.micronutrients}
    return ExtractedRow(
        raw={
            "date": row.diary_date,
            "meal_type": row.meal_type,
            "food_name": row.food_name,
            "quantity": Decimal(str(row.quantity)),
            "unit": row.unit,
            "calories_kcal": Decimal(str(row.calories_kcal)),
            "protein_g": Decimal(str(row.protein_g)),
            "carbs_g": Decimal(str(row.carbs_g)),
            "fat_g": Decimal(str(row.fat_g)),
            "fiber_g": Decimal(str(row.fiber_g)) if row.fiber_g is not None else None,
            "sugar_g": Decimal(str(row.sugar_g)) if row.sugar_g is not None else None,
            "micronutrients": micros,
            "notes": row.notes,
        },
        section_meal=None,
    )


async def extract_rows_from_text(
    text: str,
    *,
    date_format: str = "DMY",
) -> list[ExtractedRow]:
    """Call the chat model with structured output; returns ExtractedRow list."""
    if not text.strip():
        return []

    hint = (
        "Dates in the document are day-first (DMY)."
        if date_format.upper() == "DMY"
        else "Dates in the document are month-first (MDY)."
    )
    model = get_chat_model().with_structured_output(
        LlmImportResult,
        method="function_calling",
    )
    result: Any = await model.ainvoke(
        [
            HumanMessage(
                content=f"{_PROMPT}\n\n{hint}\n\n--- PDF TEXT ---\n{text[:24000]}"
            )
        ]
    )
    if isinstance(result, LlmImportResult):
        parsed = result
    else:
        parsed = LlmImportResult.model_validate(result)
    return [_to_extracted(r) for r in parsed.rows]
