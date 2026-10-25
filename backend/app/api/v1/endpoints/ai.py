"""AI vision analysis endpoint."""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, UploadFile

from app.api.deps import CurrentUser
from app.core.rate_limit import check_rate_limit
from app.schemas.ai import ImageAnalysisResponse
from app.services import ai_service

router = APIRouter()

AnalyzeHintForm = Literal["label", "plate", "auto"]


@router.post("/analyze-image", response_model=ImageAnalysisResponse)
async def analyze_image(
    current_user: CurrentUser,
    file: Annotated[UploadFile, File(description="JPEG, PNG, or WebP image")],
    hint: Annotated[AnalyzeHintForm, Form()] = "auto",
) -> ImageAnalysisResponse:
    await check_rate_limit(
        "ai_scan",
        str(current_user.id),
        limit=20,
        window_seconds=3600,
        message="Too many image analyses. Please try again later.",
    )
    return await ai_service.analyze_image(file.file, hint=hint)
