"""AI vision analysis schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

ImageType = Literal["nutrition_label", "food_plate", "not_food"]
Confidence = Literal["high", "medium", "low"]
AnalyzeHint = Literal["label", "plate", "auto"]


class MicronutrientAmount(BaseModel):
    """One micronutrient entry — list form is OpenAI structured-output friendly."""

    code: str = Field(min_length=1, max_length=64)
    amount: float = Field(ge=0)


class DraftFoodItem(BaseModel):
    food_name: str = Field(min_length=1, max_length=200)
    quantity: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=20)
    calories_kcal: float = Field(ge=0)
    protein_g: float = Field(default=0, ge=0)
    carbs_g: float = Field(default=0, ge=0)
    fat_g: float = Field(default=0, ge=0)
    fiber_g: float | None = Field(default=None, ge=0)
    sugar_g: float | None = Field(default=None, ge=0)
    # API shape: registry code → amount
    micronutrients: dict[str, float] = Field(default_factory=dict)

    @field_validator("micronutrients", mode="before")
    @classmethod
    def coerce_micronutrients(cls, value: object) -> dict[str, float]:
        """Accept LLM list[{code,amount}] or already-normalized dict."""
        if value is None:
            return {}
        if isinstance(value, dict):
            return {str(k): float(v) for k, v in value.items()}
        if isinstance(value, list):
            out: dict[str, float] = {}
            for entry in value:
                if isinstance(entry, MicronutrientAmount):
                    out[entry.code] = float(entry.amount)
                elif isinstance(entry, dict):
                    code = entry.get("code")
                    amount = entry.get("amount", 0)
                    if code:
                        out[str(code)] = float(amount)
            return out
        return {}


class ImageAnalysis(BaseModel):
    """Structured output from the vision model (pre- and post-processed)."""

    image_type: ImageType
    items: list[DraftFoodItem] = Field(default_factory=list)
    confidence: Confidence = "medium"
    notes: str = ""


class LlmDraftFoodItem(BaseModel):
    """LLM-facing item schema (no free-form dict — OpenAI strict JSON schema safe)."""

    food_name: str = Field(description="Name of the food item")
    quantity: float = Field(description="Portion quantity", gt=0)
    unit: str = Field(description="Unit: g, ml, piece, serving, cup, tbsp, or tsp")
    calories_kcal: float = Field(description="Calories for this portion", ge=0)
    protein_g: float = Field(default=0, ge=0)
    carbs_g: float = Field(default=0, ge=0)
    fat_g: float = Field(default=0, ge=0)
    fiber_g: float | None = Field(default=None, ge=0)
    sugar_g: float | None = Field(default=None, ge=0)
    micronutrients: list[MicronutrientAmount] = Field(default_factory=list)


class LlmImageAnalysis(BaseModel):
    """LLM structured-output schema (compatible with OpenAI json_schema / tools)."""

    image_type: ImageType
    items: list[LlmDraftFoodItem] = Field(default_factory=list)
    confidence: Confidence = "medium"
    notes: str = Field(default="", description="Assumptions or reading notes")


class ImageAnalysisResponse(ImageAnalysis):
    """API response — same shape as ImageAnalysis after post-processing."""
