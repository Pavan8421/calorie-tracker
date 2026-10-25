"""Chat request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ChatRole


class ConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=8000)


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: ChatRole
    content: str | None
    tool_calls: Any | None = None
    tool_call_id: str | None = None
    created_at: datetime


class ChatAction(BaseModel):
    type: str
    id: str | None = None
    detail: dict[str, Any] = Field(default_factory=dict)


class SendMessageResponse(BaseModel):
    user_message: ChatMessageRead
    assistant_message: ChatMessageRead
    actions: list[ChatAction] = Field(default_factory=list)
