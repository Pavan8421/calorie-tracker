"""Chat conversation endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbSession, get_pagination_params
from app.core.rate_limit import check_rate_limit
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageRead,
    ConversationCreate,
    ConversationRead,
    SendMessageResponse,
)
from app.schemas.common import Page, PaginationParams
from app.services import chat_service

router = APIRouter()


@router.post("/conversations", response_model=ConversationRead, status_code=201)
async def create_conversation(
    current_user: CurrentUser,
    session: DbSession,
    body: ConversationCreate | None = None,
) -> ConversationRead:
    return await chat_service.create_conversation(session, current_user, body)


@router.get("/conversations", response_model=Page[ConversationRead])
async def list_conversations(
    current_user: CurrentUser,
    session: DbSession,
    params: Annotated[PaginationParams, Depends(get_pagination_params)],
) -> Page[ConversationRead]:
    return await chat_service.list_conversations(session, current_user, params)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    await chat_service.delete_conversation(session, current_user, conversation_id)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=Page[ChatMessageRead],
)
async def list_messages(
    conversation_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    params: Annotated[PaginationParams, Depends(get_pagination_params)],
) -> Page[ChatMessageRead]:
    return await chat_service.list_messages(
        session, current_user, conversation_id, params
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=SendMessageResponse,
)
async def send_message(
    conversation_id: uuid.UUID,
    body: ChatMessageCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> SendMessageResponse:
    await check_rate_limit(
        "chat",
        str(current_user.id),
        limit=30,
        window_seconds=60,
        message="Too many chat messages. Please try again later.",
    )
    return await chat_service.send_message(
        session, current_user, conversation_id, body
    )
