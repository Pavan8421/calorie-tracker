"""Phase 6 AI analyze-image API tests."""

from __future__ import annotations

import io

import pytest
from app.schemas.ai import DraftFoodItem, ImageAnalysis
from httpx import AsyncClient
from PIL import Image


def _jpeg_bytes(size: tuple[int, int] = (64, 64)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color=(200, 100, 50)).save(buf, format="JPEG")
    return buf.getvalue()


def _label_analysis() -> ImageAnalysis:
    return ImageAnalysis(
        image_type="nutrition_label",
        confidence="high",
        notes="per serving",
        items=[
            DraftFoodItem(
                food_name="Greek Yogurt",
                quantity=1,
                unit="serving",
                calories_kcal=120,
                protein_g=15,
                carbs_g=6,
                fat_g=4,
                micronutrients={"calcium_mg": 150, "fake_key": 1},
            )
        ],
    )


def _plate_analysis() -> ImageAnalysis:
    return ImageAnalysis(
        image_type="food_plate",
        confidence="medium",
        notes="estimated portions",
        items=[
            DraftFoodItem(
                food_name="Rice",
                quantity=150,
                unit="g",
                calories_kcal=200,
                protein_g=4,
                carbs_g=45,
                fat_g=0.5,
            ),
            DraftFoodItem(
                food_name="Dal",
                quantity=100,
                unit="g",
                calories_kcal=120,
                protein_g=8,
                carbs_g=15,
                fat_g=3,
            ),
        ],
    )


@pytest.mark.asyncio
async def test_analyze_label_image(
    client: AsyncClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_analyze(_b64: str, hint: str) -> ImageAnalysis:
        assert hint == "label"
        return _label_analysis()

    monkeypatch.setattr(
        "app.integrations.vision.analyze_food_image",
        fake_analyze,
    )

    response = await client.post(
        "/api/v1/ai/analyze-image",
        headers=auth_headers,
        files={"file": ("label.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"hint": "label"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["image_type"] == "nutrition_label"
    assert len(body["items"]) == 1
    assert body["items"][0]["food_name"] == "Greek Yogurt"
    assert body["items"][0]["calories_kcal"] == 120
    assert "fake_key" not in body["items"][0]["micronutrients"]
    assert body["items"][0]["micronutrients"]["calcium_mg"] == 150


@pytest.mark.asyncio
async def test_analyze_plate_multiple_drafts(
    client: AsyncClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_analyze(_b64: str, _hint: str) -> ImageAnalysis:
        return _plate_analysis()

    monkeypatch.setattr("app.integrations.vision.analyze_food_image", fake_analyze)

    response = await client.post(
        "/api/v1/ai/analyze-image",
        headers=auth_headers,
        files={"file": ("plate.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"hint": "plate"},
    )
    assert response.status_code == 200
    assert len(response.json()["items"]) == 2


@pytest.mark.asyncio
async def test_analyze_not_food(
    client: AsyncClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_analyze(_b64: str, _hint: str) -> ImageAnalysis:
        return ImageAnalysis(image_type="not_food", items=[], confidence="high", notes="")

    monkeypatch.setattr("app.integrations.vision.analyze_food_image", fake_analyze)

    response = await client.post(
        "/api/v1/ai/analyze-image",
        headers=auth_headers,
        files={"file": ("x.jpg", _jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "NOT_FOOD_IMAGE"


@pytest.mark.asyncio
async def test_analyze_rejects_non_image(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/ai/analyze-image",
        headers=auth_headers,
        files={"file": ("x.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UNSUPPORTED_IMAGE"


@pytest.mark.asyncio
async def test_analyze_rejects_too_large(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    huge = b"\xff\xd8\xff" + (b"a" * (5 * 1024 * 1024 + 10))
    response = await client.post(
        "/api/v1/ai/analyze-image",
        headers=auth_headers,
        files={"file": ("big.jpg", huge, "image/jpeg")},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"


@pytest.mark.asyncio
async def test_analyze_timeout_maps_to_504(
    client: AsyncClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def boom(_b64: str, _hint: str) -> ImageAnalysis:
        raise TimeoutError("request timed out")

    monkeypatch.setattr("app.integrations.vision.analyze_food_image", boom)

    response = await client.post(
        "/api/v1/ai/analyze-image",
        headers=auth_headers,
        files={"file": ("x.jpg", _jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 504
    assert response.json()["error"]["code"] == "AI_TIMEOUT"


@pytest.mark.asyncio
async def test_analyze_unavailable_maps_to_503(
    client: AsyncClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def boom(_b64: str, _hint: str) -> ImageAnalysis:
        raise RuntimeError("connection failed")

    monkeypatch.setattr("app.integrations.vision.analyze_food_image", boom)

    response = await client.post(
        "/api/v1/ai/analyze-image",
        headers=auth_headers,
        files={"file": ("x.jpg", _jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AI_UNAVAILABLE"


@pytest.mark.asyncio
async def test_analyze_rate_limit(
    client: AsyncClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_analyze(_b64: str, _hint: str) -> ImageAnalysis:
        return _label_analysis()

    monkeypatch.setattr("app.integrations.vision.analyze_food_image", fake_analyze)

    last = None
    for _ in range(21):
        last = await client.post(
            "/api/v1/ai/analyze-image",
            headers=auth_headers,
            files={"file": ("x.jpg", _jpeg_bytes(), "image/jpeg")},
        )
    assert last is not None
    assert last.status_code == 429
    assert last.json()["error"]["code"] == "RATE_LIMITED"
    assert "Retry-After" in last.headers
