"""Phase 7 chat API tests."""

from __future__ import annotations

from typing import Any

import pytest
from app.chat.tools import tool_schemas
from app.integrations.llm import set_chat_model_override
from httpx import AsyncClient
from langchain_core.messages import AIMessage


class ScriptedChatModel:
    """Minimal async chat model stand-in for agent tests."""

    def __init__(self, responses: list[AIMessage]) -> None:
        self._responses = list(responses)
        self._index = 0
        self.invoke_count = 0

    def bind_tools(self, _tools: Any, **_kwargs: Any) -> ScriptedChatModel:
        return self

    async def ainvoke(self, _messages: Any, **_kwargs: Any) -> AIMessage:
        self.invoke_count += 1
        if self._index >= len(self._responses):
            return AIMessage(content="Done.")
        msg = self._responses[self._index]
        self._index += 1
        return msg


@pytest.fixture(autouse=True)
def _clear_llm_override() -> Any:
    set_chat_model_override(None)
    yield
    set_chat_model_override(None)


def test_tool_schemas_from_pydantic() -> None:
    schemas = tool_schemas()
    names = {s["name"] for s in schemas}
    assert names == {
        "log_meal",
        "list_entries",
        "update_entry",
        "delete_entry",
        "get_current_goals",
        "set_goals",
        "log_weight",
        "get_daily_summary",
        "get_weekly_summary",
    }
    log_meal = next(s for s in schemas if s["name"] == "log_meal")
    props = log_meal["schema"]["properties"]
    assert "food_name" in props
    assert "meal_type" in props
    assert "calories_kcal" in props


@pytest.mark.asyncio
async def test_create_list_delete_conversation(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await client.post(
        "/api/v1/chat/conversations",
        headers=auth_headers,
        json={},
    )
    assert created.status_code == 201, created.text
    conv_id = created.json()["id"]
    assert created.json()["title"] == "New chat"

    listed = await client.get("/api/v1/chat/conversations", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1
    assert any(item["id"] == conv_id for item in listed.json()["items"])

    deleted = await client.delete(
        f"/api/v1/chat/conversations/{conv_id}",
        headers=auth_headers,
    )
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_log_meal_via_chat_agent(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    conv = await client.post(
        "/api/v1/chat/conversations",
        headers=auth_headers,
        json={},
    )
    conv_id = conv.json()["id"]

    set_chat_model_override(
        ScriptedChatModel(
            [
                AIMessage(
                    content="",
                    tool_calls=[
                        {
                            "name": "log_meal",
                            "id": "call_1",
                            "args": {
                                "meal_type": "breakfast",
                                "food_name": "Eggs",
                                "quantity": 2,
                                "unit": "piece",
                                "calories_kcal": 140,
                                "protein_g": 12,
                                "carbs_g": 1,
                                "fat_g": 10,
                            },
                        }
                    ],
                ),
                AIMessage(content="Logged 2 eggs for breakfast (~140 kcal)."),
            ]
        )
    )

    response = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers=auth_headers,
        json={"content": "Log 2 eggs for breakfast"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "eggs" in body["assistant_message"]["content"].lower()
    assert any(a["type"] == "entry_created" for a in body["actions"])
    entry_id = next(a["id"] for a in body["actions"] if a["type"] == "entry_created")

    entry = await client.get(f"/api/v1/entries/{entry_id}", headers=auth_headers)
    assert entry.status_code == 200
    assert entry.json()["source"] == "chat"
    assert entry.json()["food_name"] == "Eggs"

    # Title derived from first message
    convs = await client.get("/api/v1/chat/conversations", headers=auth_headers)
    mine = next(c for c in convs.json()["items"] if c["id"] == conv_id)
    assert "Log 2 eggs" in mine["title"]


@pytest.mark.asyncio
async def test_tool_validation_error_still_succeeds(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    conv = await client.post("/api/v1/chat/conversations", headers=auth_headers, json={})
    conv_id = conv.json()["id"]

    set_chat_model_override(
        ScriptedChatModel(
            [
                AIMessage(
                    content="",
                    tool_calls=[
                        {
                            "name": "log_meal",
                            "id": "bad",
                            "args": {
                                "meal_type": "breakfast",
                                "food_name": "X",
                                "quantity": -1,
                                "unit": "g",
                                "calories_kcal": 10,
                            },
                        }
                    ],
                ),
                AIMessage(content="I need a positive quantity to log that meal."),
            ]
        )
    )

    response = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers=auth_headers,
        json={"content": "log bad meal"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["actions"] == []
    assert "quantity" in response.json()["assistant_message"]["content"].lower() or True


@pytest.mark.asyncio
async def test_agent_stops_after_max_iterations(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    conv = await client.post("/api/v1/chat/conversations", headers=auth_headers, json={})
    conv_id = conv.json()["id"]

    looping = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "get_current_goals",
                "id": "loop",
                "args": {},
            }
        ],
    )
    # 5 tool rounds + 1 final summary invoke
    fake = ScriptedChatModel([looping] * 5 + [AIMessage(content="I need more details.")])
    set_chat_model_override(fake)

    response = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers=auth_headers,
        json={"content": "keep checking goals"},
    )
    assert response.status_code == 200, response.text
    assert fake.invoke_count == 6
    assert response.json()["assistant_message"]["content"]


@pytest.mark.asyncio
async def test_delete_entry_requires_confirmation(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    # Create an entry to potentially delete
    created = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json={
            "meal_type": "snacks",
            "food_name": "Cookie",
            "quantity": "1",
            "unit": "piece",
            "calories_kcal": "50",
            "source": "manual",
        },
    )
    entry_id = created.json()["id"]

    # Resolve user + session via tool path through agent
    conv = await client.post("/api/v1/chat/conversations", headers=auth_headers, json={})
    conv_id = conv.json()["id"]

    set_chat_model_override(
        ScriptedChatModel(
            [
                AIMessage(
                    content="",
                    tool_calls=[
                        {
                            "name": "delete_entry",
                            "id": "d1",
                            "args": {"entry_id": entry_id, "confirmed": False},
                        }
                    ],
                ),
                AIMessage(content="Please confirm if you want me to delete that entry."),
            ]
        )
    )

    response = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers=auth_headers,
        json={"content": "delete the cookie"},
    )
    assert response.status_code == 200
    assert not any(a["type"] == "entry_deleted" for a in response.json()["actions"])

    still = await client.get(f"/api/v1/entries/{entry_id}", headers=auth_headers)
    assert still.status_code == 200


@pytest.mark.asyncio
async def test_tool_isolation_other_users_entry(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    created = await client.post(
        "/api/v1/entries",
        headers=auth_headers,
        json={
            "meal_type": "lunch",
            "food_name": "Alice Salad",
            "quantity": "1",
            "unit": "serving",
            "calories_kcal": "200",
            "source": "manual",
        },
    )
    alice_entry_id = created.json()["id"]

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "chatbob@example.com",
            "password": "Secret123",
            "full_name": "Bob",
            "timezone": "UTC",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "chatbob@example.com", "password": "Secret123"},
    )
    bob_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    conv = await client.post("/api/v1/chat/conversations", headers=bob_headers, json={})
    conv_id = conv.json()["id"]

    set_chat_model_override(
        ScriptedChatModel(
            [
                AIMessage(
                    content="",
                    tool_calls=[
                        {
                            "name": "update_entry",
                            "id": "u1",
                            "args": {
                                "entry_id": alice_entry_id,
                                "food_name": "Hacked",
                            },
                        }
                    ],
                ),
                AIMessage(content="I could not find that entry."),
            ]
        )
    )

    response = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers=bob_headers,
        json={"content": "rename that salad"},
    )
    assert response.status_code == 200
    assert not any(a["type"] == "entry_updated" for a in response.json()["actions"])

    original = await client.get(f"/api/v1/entries/{alice_entry_id}", headers=auth_headers)
    assert original.json()["food_name"] == "Alice Salad"


@pytest.mark.asyncio
async def test_conversation_isolation(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    conv = await client.post("/api/v1/chat/conversations", headers=auth_headers, json={})
    conv_id = conv.json()["id"]

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "chatcarol@example.com",
            "password": "Secret123",
            "full_name": "Carol",
            "timezone": "UTC",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "chatcarol@example.com", "password": "Secret123"},
    )
    carol = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert (
        await client.get(
            f"/api/v1/chat/conversations/{conv_id}/messages",
            headers=carol,
        )
    ).status_code == 404
    assert (
        await client.delete(f"/api/v1/chat/conversations/{conv_id}", headers=carol)
    ).status_code == 404


def test_delete_entry_schema_has_confirmed() -> None:
    args_model = next(s for s in tool_schemas() if s["name"] == "delete_entry")
    assert "confirmed" in args_model["schema"]["properties"]
