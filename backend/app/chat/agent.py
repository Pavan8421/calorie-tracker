"""LangChain tool-calling agent loop (max iterations)."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.chat.prompts import build_system_prompt
from app.chat.tools import ToolContext, build_tools
from app.core.errors import AppError, ExternalServiceError
from app.core.time import today_for
from app.integrations.llm import get_chat_model
from app.models.user import User
from app.repositories import chat_repo

logger = logging.getLogger(__name__)

_MAX_ITERATIONS = 5
_CONTEXT_MESSAGES = 20


@dataclass
class AgentResult:
    assistant_text: str
    actions: list[dict[str, Any]]
    raw_messages: list[BaseMessage]


def _map_llm_error(exc: BaseException) -> AppError:
    name = type(exc).__name__
    message = str(exc).lower()
    if isinstance(exc, TimeoutError) or "timeout" in name.lower() or "timed out" in message:
        return ExternalServiceError(
            code="AI_TIMEOUT",
            message="AI chat timed out. Please try again.",
            status_code=504,
        )
    if "ratelimit" in name.lower() or "rate_limit" in message or "429" in message:
        return ExternalServiceError(
            code="AI_UNAVAILABLE",
            message="AI service is temporarily unavailable. Please try again later.",
            status_code=503,
        )
    logger.warning("Chat LLM error: %s: %s", name, exc, exc_info=True)
    return ExternalServiceError(
        code="AI_UNAVAILABLE",
        message="AI service is temporarily unavailable. Please try again later.",
        status_code=503,
    )


def _history_to_lc_messages(rows: list[Any]) -> list[BaseMessage]:
    """Convert persisted messages to LangChain messages (skip tool plumbing for brevity)."""
    out: list[BaseMessage] = []
    for row in rows:
        role = row.role.value if hasattr(row.role, "value") else str(row.role)
        if role == "user" and row.content:
            out.append(HumanMessage(content=row.content))
        elif role == "assistant" and row.content:
            out.append(AIMessage(content=row.content))
    return out


async def run_agent(
    session: AsyncSession,
    user: User,
    *,
    conversation_id: Any,
    user_text: str,
) -> AgentResult:
    ctx = ToolContext(session=session, user=user)
    tools = build_tools(ctx)
    tools_by_name = {t.name: t for t in tools}

    history = await chat_repo.list_recent_messages(
        session, conversation_id, limit=_CONTEXT_MESSAGES
    )
    # Exclude the just-persisted user message from history duplication if present last
    prior = history[:-1] if history and history[-1].content == user_text else history

    messages: list[BaseMessage] = [
        SystemMessage(content=build_system_prompt(user, today=today_for(user))),
        *_history_to_lc_messages(prior),
        HumanMessage(content=user_text),
    ]

    model = get_chat_model().bind_tools(tools)

    try:
        for _ in range(_MAX_ITERATIONS):
            response = await model.ainvoke(messages)
            messages.append(response)

            tool_calls = getattr(response, "tool_calls", None) or []
            if not tool_calls:
                text = response.content if isinstance(response.content, str) else str(
                    response.content or ""
                )
                return AgentResult(
                    assistant_text=text.strip() or "Done.",
                    actions=ctx.actions,
                    raw_messages=messages,
                )

            for call in tool_calls:
                if isinstance(call, dict):
                    name = call.get("name", "")
                    args = call.get("args") or {}
                    call_id = call.get("id") or name
                else:
                    name = getattr(call, "name", "") or ""
                    args = getattr(call, "args", {}) or {}
                    call_id = getattr(call, "id", None) or name
                tool = tools_by_name.get(name)
                if tool is None:
                    tool_result = json_error(f"Unknown tool: {name}")
                else:
                    # LangChain validates args_schema before the handler; surface
                    # those errors to the model instead of failing the request.
                    try:
                        tool_result = await tool.ainvoke(args)
                    except ValidationError as exc:
                        tool_result = json.dumps(
                            {
                                "error": "Invalid tool arguments",
                                "details": exc.errors(),
                            },
                            default=str,
                        )
                    except Exception as exc:
                        logger.warning(
                            "Tool %s failed: %s: %s", name, type(exc).__name__, exc
                        )
                        tool_result = json_error(str(exc))
                messages.append(
                    ToolMessage(
                        content=str(tool_result),
                        tool_call_id=str(call_id),
                    )
                )

        # Hit iteration cap — ask model for a final answer without tools
        final = await get_chat_model().ainvoke(
            messages
            + [
                HumanMessage(
                    content=(
                        "Stop calling tools. Briefly summarize what you did or what "
                        "you still need from the user."
                    )
                )
            ]
        )
        text = final.content if isinstance(final.content, str) else str(final.content or "")
        return AgentResult(
            assistant_text=text.strip() or "I reached my step limit. Please try again.",
            actions=ctx.actions,
            raw_messages=messages,
        )
    except AppError:
        raise
    except Exception as exc:
        raise _map_llm_error(exc) from exc


def json_error(message: str) -> str:
    return json.dumps({"error": message})
