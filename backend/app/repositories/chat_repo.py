"""Chat conversation and message persistence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatConversation, ChatMessage
from app.models.enums import ChatRole
from app.repositories.base import paginate
from app.schemas.common import Page, PaginationParams


async def create_conversation(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    title: str,
) -> ChatConversation:
    conversation = ChatConversation(user_id=user_id, title=title)
    session.add(conversation)
    await session.flush()
    await session.refresh(conversation)
    return conversation


async def get_conversation(
    session: AsyncSession,
    conversation_id: uuid.UUID,
) -> ChatConversation | None:
    result = await session.execute(
        select(ChatConversation).where(ChatConversation.id == conversation_id)
    )
    return result.scalar_one_or_none()


async def list_conversations(
    session: AsyncSession,
    user_id: uuid.UUID,
    params: PaginationParams,
) -> Page[ChatConversation]:
    stmt = (
        select(ChatConversation)
        .where(ChatConversation.user_id == user_id)
        .order_by(ChatConversation.updated_at.desc(), ChatConversation.id.desc())
    )
    return await paginate(session, stmt, params)


async def delete_conversation(session: AsyncSession, conversation: ChatConversation) -> None:
    await session.delete(conversation)
    await session.flush()


async def touch_conversation(session: AsyncSession, conversation: ChatConversation) -> None:
    conversation.updated_at = datetime.now(UTC)
    session.add(conversation)
    await session.flush()


async def add_message(
    session: AsyncSession,
    *,
    conversation_id: uuid.UUID,
    role: ChatRole,
    content: str | None = None,
    tool_calls: Any | None = None,
    tool_call_id: str | None = None,
) -> ChatMessage:
    message = ChatMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        tool_calls=tool_calls,
        tool_call_id=tool_call_id,
    )
    session.add(message)
    await session.flush()
    await session.refresh(message)
    return message


async def list_messages(
    session: AsyncSession,
    conversation_id: uuid.UUID,
    params: PaginationParams,
) -> Page[ChatMessage]:
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
    )
    return await paginate(session, stmt, params)


async def list_recent_messages(
    session: AsyncSession,
    conversation_id: uuid.UUID,
    *,
    limit: int = 20,
) -> list[ChatMessage]:
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    rows = list(result.scalars().all())
    rows.reverse()
    return rows
