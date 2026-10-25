"""Unit tests for image preprocessing and AI post-processing."""

from __future__ import annotations

import base64
import io

import pytest
from app.core.errors import AppError
from app.schemas.ai import DraftFoodItem, ImageAnalysis
from app.services.ai_service import post_process_analysis, preprocess_image
from PIL import Image
from PIL.ExifTags import Base as ExifBase


def test_preprocess_resizes_and_strips_exif() -> None:
    # Build a JPEG with EXIF Orientation
    img = Image.new("RGB", (1800, 900), color=(1, 2, 3))
    exif = img.getexif()
    exif[ExifBase.Orientation] = 6
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    raw = buf.getvalue()

    b64 = preprocess_image(raw)
    decoded = base64.b64decode(b64)
    out = Image.open(io.BytesIO(decoded))
    out.load()

    assert out.format == "JPEG"
    assert max(out.size) <= 1024
    assert not out.getexif() or ExifBase.Orientation not in out.getexif()


def test_preprocess_rejects_corrupt_bytes() -> None:
    with pytest.raises(AppError) as exc:
        preprocess_image(b"not-an-image")
    assert exc.value.status_code == 415
    assert exc.value.code == "UNSUPPORTED_IMAGE"


def test_post_process_drops_unknown_and_clamps() -> None:
    dirty_item = DraftFoodItem.model_construct(
        food_name="Yogurt",
        quantity=1,
        unit="serving",
        calories_kcal=100,
        protein_g=-5,
        carbs_g=10,
        fat_g=2,
        fiber_g=None,
        sugar_g=None,
        micronutrients={
            "vitamin_c_mg": -3,
            "made_up_nutrient": 99,
            "iron_mg": 1.5,
        },
    )
    analysis = ImageAnalysis(
        image_type="nutrition_label",
        confidence="high",
        notes="",
        items=[dirty_item],
    )
    cleaned = post_process_analysis(analysis)
    item = cleaned.items[0]
    assert item.protein_g == 0.0
    assert item.micronutrients == {"vitamin_c_mg": 0.0, "iron_mg": 1.5}
    assert "made_up_nutrient" not in item.micronutrients


def test_draft_item_coerces_micronutrient_list() -> None:
    item = DraftFoodItem.model_validate(
        {
            "food_name": "Milk",
            "quantity": 1,
            "unit": "cup",
            "calories_kcal": 100,
            "micronutrients": [
                {"code": "calcium_mg", "amount": 300},
                {"code": "vitamin_d_mcg", "amount": 2.5},
            ],
        }
    )
    assert item.micronutrients == {"calcium_mg": 300.0, "vitamin_d_mcg": 2.5}


def test_post_process_macro_sanity_note() -> None:
    analysis = ImageAnalysis(
        image_type="food_plate",
        items=[
            DraftFoodItem(
                food_name="Rice",
                quantity=1,
                unit="serving",
                calories_kcal=500,
                protein_g=1,
                carbs_g=1,
                fat_g=1,
            )
        ],
    )
    cleaned = post_process_analysis(analysis)
    assert "differ from calories_kcal" in cleaned.notes
