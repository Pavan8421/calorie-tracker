"""Vision prompts and LangChain structured-output image analysis."""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import HumanMessage

from app.integrations.llm import get_vision_model
from app.nutrients import NUTRIENTS
from app.schemas.ai import AnalyzeHint, ImageAnalysis, LlmImageAnalysis

logger = logging.getLogger(__name__)

_NUTRIENT_CODES = ", ".join(n.code for n in NUTRIENTS)

_BASE_RULES = f"""
You analyze food-related images for a calorie tracker.
Return structured data only matching the schema.
Micronutrients must be a list of {{code, amount}} objects.
Use only these micronutrient codes when present: {_NUTRIENT_CODES}.
Omit micronutrients you cannot estimate. Never invent unknown codes.
Units should be one of: g, ml, piece, serving, cup, tbsp, tsp.
Quantities and macros must be for the portion shown (or one serving on a label).
If the image is not food or a nutrition label, set image_type to not_food and items to [].
""".strip()

_HINT_PROMPTS: dict[AnalyzeHint, str] = {
    "label": (
        "This is a nutrition facts label. Read values exactly as printed per serving. "
        "Return image_type=nutrition_label and one item for that serving."
    ),
    "plate": (
        "This is a plate or meal photo. Identify each distinct food item and estimate "
        "portion size and nutrition. Return image_type=food_plate with one item per food."
    ),
    "auto": (
        "Classify the image first: nutrition_label, food_plate, or not_food. "
        "Then extract nutrition accordingly (label → exact values; plate → estimates)."
    ),
}


def build_vision_prompt(hint: AnalyzeHint) -> str:
    return f"{_BASE_RULES}\n\n{_HINT_PROMPTS[hint]}"


def _to_image_analysis(result: Any) -> ImageAnalysis:
    if isinstance(result, ImageAnalysis):
        return result
    if isinstance(result, LlmImageAnalysis):
        return ImageAnalysis.model_validate(result.model_dump())
    return ImageAnalysis.model_validate(result)


async def analyze_food_image(image_jpeg_base64: str, hint: AnalyzeHint) -> ImageAnalysis:
    """Call the vision model with structured output. Raises raw provider errors."""
    # function_calling accepts schemas that OpenAI strict json_schema rejects
    # (and our micronutrient list form is also strict-friendly).
    model = get_vision_model().with_structured_output(
        LlmImageAnalysis,
        method="function_calling",
    )
    message = HumanMessage(
        content=[
            {"type": "text", "text": build_vision_prompt(hint)},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{image_jpeg_base64}",
                },
            },
        ]
    )
    result: Any = await model.ainvoke([message])
    return _to_image_analysis(result)
