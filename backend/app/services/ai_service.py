"""AI image analysis: validate, preprocess, call vision, post-process drafts."""

from __future__ import annotations

import base64
import io
import logging
from typing import BinaryIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.errors import AppError, BusinessRuleError, ExternalServiceError
from app.integrations import vision as vision_mod
from app.nutrients import is_known_nutrient
from app.schemas.ai import AnalyzeHint, DraftFoodItem, ImageAnalysis, ImageAnalysisResponse

logger = logging.getLogger(__name__)

_MAX_UPLOAD_BYTES = 5 * 1024 * 1024
_MAX_IMAGE_SIDE = 1024
_ALLOWED_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})


def preprocess_image(raw: bytes) -> str:
    """Apply EXIF orientation, strip EXIF, resize, re-encode as JPEG; return base64."""
    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except UnidentifiedImageError as exc:
        raise AppError(
            code="UNSUPPORTED_IMAGE",
            message="File is not a supported image (JPEG, PNG, or WebP)",
            status_code=415,
        ) from exc
    except OSError as exc:
        raise AppError(
            code="UNSUPPORTED_IMAGE",
            message="File is not a supported image (JPEG, PNG, or WebP)",
            status_code=415,
        ) from exc

    if image.format not in _ALLOWED_FORMATS:
        raise AppError(
            code="UNSUPPORTED_IMAGE",
            message="File is not a supported image (JPEG, PNG, or WebP)",
            status_code=415,
        )

    image = ImageOps.exif_transpose(image)
    if image.mode != "RGB":
        image = image.convert("RGB")

    width, height = image.size
    longest = max(width, height)
    if longest > _MAX_IMAGE_SIDE:
        scale = _MAX_IMAGE_SIDE / longest
        image = image.resize(
            (max(1, int(width * scale)), max(1, int(height * scale))),
            Image.Resampling.LANCZOS,
        )

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85, exif=b"")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _clamp_non_negative(value: float | None) -> float | None:
    if value is None:
        return None
    return max(0.0, float(value))


def post_process_analysis(analysis: ImageAnalysis) -> ImageAnalysis:
    """Drop unknown micronutrient keys, clamp negatives, add macro sanity notes."""
    notes = analysis.notes.strip()
    cleaned_items: list[DraftFoodItem] = []

    for item in analysis.items:
        micros: dict[str, float] = {}
        for key, raw in item.micronutrients.items():
            if not is_known_nutrient(key):
                continue
            micros[key] = max(0.0, float(raw))

        calories = max(0.0, float(item.calories_kcal))
        protein = max(0.0, float(item.protein_g))
        carbs = max(0.0, float(item.carbs_g))
        fat = max(0.0, float(item.fat_g))
        from_macros = protein * 4 + carbs * 4 + fat * 9
        item_notes = ""
        if calories > 0 and abs(from_macros - calories) / calories > 0.20:
            item_notes = (
                f"Macro calories for '{item.food_name}' differ from calories_kcal by >20%."
            )

        cleaned_items.append(
            DraftFoodItem(
                food_name=item.food_name.strip() or "Unknown food",
                quantity=max(0.01, float(item.quantity)),
                unit=item.unit.strip() or "serving",
                calories_kcal=calories,
                protein_g=protein,
                carbs_g=carbs,
                fat_g=fat,
                fiber_g=_clamp_non_negative(item.fiber_g),
                sugar_g=_clamp_non_negative(item.sugar_g),
                micronutrients=micros,
            )
        )
        if item_notes:
            notes = f"{notes} {item_notes}".strip() if notes else item_notes

    return ImageAnalysis(
        image_type=analysis.image_type,
        items=cleaned_items,
        confidence=analysis.confidence,
        notes=notes,
    )


def _map_llm_error(exc: BaseException) -> AppError:
    """Map provider / LangChain errors to API AppErrors."""
    name = type(exc).__name__
    message = str(exc).lower()

    if isinstance(exc, TimeoutError) or "timeout" in name.lower() or "timed out" in message:
        return ExternalServiceError(
            code="AI_TIMEOUT",
            message="AI analysis timed out. Please try again.",
            status_code=504,
        )

    if "ratelimit" in name.lower() or "rate_limit" in message or "429" in message:
        return ExternalServiceError(
            code="AI_UNAVAILABLE",
            message="AI service is temporarily unavailable. Please try again later.",
            status_code=503,
        )

    if (
        "refus" in message
        or ("content" in message and ("filter" in message or "policy" in message))
        or name in {"BadRequestError", "ContentFilterFinishReasonError"}
    ):
        return BusinessRuleError(
            code="AI_REFUSED",
            message="The AI refused to analyze this image",
        )

    logger.warning("AI provider error: %s: %s", name, exc, exc_info=True)
    return ExternalServiceError(
        code="AI_UNAVAILABLE",
        message="AI service is temporarily unavailable. Please try again later.",
        status_code=503,
    )


async def analyze_image(
    file_obj: BinaryIO,
    *,
    hint: AnalyzeHint = "auto",
) -> ImageAnalysisResponse:
    raw = file_obj.read()
    if not raw:
        raise AppError(
            code="UNSUPPORTED_IMAGE",
            message="Empty file",
            status_code=415,
        )
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise AppError(
            code="PAYLOAD_TOO_LARGE",
            message="Image must be 5 MB or smaller",
            status_code=413,
        )

    image_b64 = preprocess_image(raw)

    try:
        analysis = await vision_mod.analyze_food_image(image_b64, hint)
    except AppError:
        raise
    except Exception as exc:
        raise _map_llm_error(exc) from exc

    processed = post_process_analysis(analysis)

    if processed.image_type == "not_food":
        raise BusinessRuleError(
            code="NOT_FOOD_IMAGE",
            message="The image does not appear to be food or a nutrition label",
        )

    return ImageAnalysisResponse.model_validate(processed.model_dump())
