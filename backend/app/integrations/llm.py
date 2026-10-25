"""Shared LangChain chat-model factory (injectable for tests)."""

from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI

from app.core.config import get_settings

_chat_model_override: Any | None = None


def set_chat_model_override(model: Any | None) -> None:
    """Replace the chat model used by vision/chat/PDF (tests)."""
    global _chat_model_override
    _chat_model_override = model


def get_chat_model_override() -> Any | None:
    return _chat_model_override


def get_vision_model() -> Any:
    """Chat model for image analysis (structured output applied by callers)."""
    if _chat_model_override is not None:
        return _chat_model_override

    settings = get_settings()
    return ChatOpenAI(
        model=settings.openai_vision_model,
        api_key=settings.openai_api_key or "missing",
        timeout=float(settings.openai_timeout_seconds),
        max_retries=1,
    )


def get_chat_model() -> Any:
    """Chat model for conversational agents and text structured output."""
    if _chat_model_override is not None:
        return _chat_model_override

    settings = get_settings()
    return ChatOpenAI(
        model=settings.openai_chat_model,
        api_key=settings.openai_api_key or "missing",
        timeout=float(settings.openai_timeout_seconds),
        max_retries=1,
    )
