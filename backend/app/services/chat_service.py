"""Chat conversation business logic."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.chat.agent import run_agent
from app.core.errors import NotFoundError
from app.models.enums import ChatRole
from app.models.user import User
from app.repositories import chat_repo
from app.schemas.chat import (
    ChatAction,
    ChatMessageCreate,
    ChatMessageRead,
    ConversationCreate,
    ConversationRead,
    SendMessageResponse,
)
from app.schemas.common import Page, PaginationParams


def _title_from_message(content: str) -> str:
    cleaned = " ".join(content.strip().split())
    if len(cleaned) <= 80:
        return cleaned or "New chat"
    return cleaned[:77] + "..."


async def create_conversation(
    session: AsyncSession,
    user: User,
    data: ConversationCreate | None = None,
) -> ConversationRead:
    title = (data.title.strip() if data and data.title else None) or "New chat"
    conversation = await chat_repo.create_conversation(
        session, user_id=user.id, title=title
    )
    await session.commit()
    await session.refresh(conversation)
    return ConversationRead.model_validate(conversation)


async def list_conversations(
    session: AsyncSession,
    user: User,
    params: PaginationParams,
) -> Page[ConversationRead]:
    page = await chat_repo.list_conversations(session, user.id, params)
    return Page.create(
        items=[ConversationRead.model_validate(c) for c in page.items],
        total=page.total,
        params=params,
    )


async def delete_conversation(
    session: AsyncSession,
    user: User,
    conversation_id: uuid.UUID,
) -> None:
    conversation = await chat_repo.get_conversation(session, conversation_id)
    if conversation is None or conversation.user_id != user.id:
        raise NotFoundError(code="NOT_FOUND", message="Conversation not found")
    await chat_repo.delete_conversation(session, conversation)
    await session.commit()


async def list_messages(
    session: AsyncSession,
    user: User,
    conversation_id: uuid.UUID,
    params: PaginationParams,
) -> Page[ChatMessageRead]:
    conversation = await chat_repo.get_conversation(session, conversation_id)
    if conversation is None or conversation.user_id != user.id:
        raise NotFoundError(code="NOT_FOUND", message="Conversation not found")
    page = await chat_repo.list_messages(session, conversation_id, params)
    return Page.create(
        items=[ChatMessageRead.model_validate(m) for m in page.items],
        total=page.total,
        params=params,
    )


async def send_message(
    session: AsyncSession,
    user: User,
    conversation_id: uuid.UUID,
    data: ChatMessageCreate,
) -> SendMessageResponse:
    conversation = await chat_repo.get_conversation(session, conversation_id)
    if conversation is None or conversation.user_id != user.id:
        raise NotFoundError(code="NOT_FOUND", message="Conversation not found")

    content = data.content.strip()
    user_msg = await chat_repo.add_message(
        session,
        conversation_id=conversation.id,
        role=ChatRole.user,
        content=content,
    )

    if conversation.title == "New chat":
        conversation.title = _title_from_message(content)

    result = await run_agent(
        session,
        user,
        conversation_id=conversation.id,
        user_text=content,
    )

    assistant_msg = await chat_repo.add_message(
        session,
        conversation_id=conversation.id,
        role=ChatRole.assistant,
        content=result.assistant_text,
    )
    await chat_repo.touch_conversation(session, conversation)
    await session.commit()
    await session.refresh(user_msg)
    await session.refresh(assistant_msg)

    actions = []
    for a in result.actions:
        detail = {k: v for k, v in a.items() if k not in {"type", "id"}}
        actions.append(ChatAction(type=a["type"], id=a.get("id"), detail=detail))
    return SendMessageResponse(
        user_message=ChatMessageRead.model_validate(user_msg),
        assistant_message=ChatMessageRead.model_validate(assistant_msg),
        actions=actions,
    )
