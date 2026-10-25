"""add chat_conversations and chat_messages

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-10-25 10:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

chat_role = postgresql.ENUM(
    "user",
    "assistant",
    "tool",
    name="chat_role",
    create_type=False,
)


def upgrade() -> None:
    chat_role.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "chat_conversations",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_chat_conversations_user_id"),
        "chat_conversations",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_chat_conversations_user_updated",
        "chat_conversations",
        ["user_id", "updated_at"],
        unique=False,
    )

    op.create_table(
        "chat_messages",
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "user",
                "assistant",
                "tool",
                name="chat_role",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("tool_calls", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("tool_call_id", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["chat_conversations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_chat_messages_conversation_id"),
        "chat_messages",
        ["conversation_id"],
        unique=False,
    )
    op.create_index(
        "ix_chat_messages_conversation_created",
        "chat_messages",
        ["conversation_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_chat_messages_conversation_created", table_name="chat_messages")
    op.drop_index(op.f("ix_chat_messages_conversation_id"), table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_chat_conversations_user_updated", table_name="chat_conversations")
    op.drop_index(op.f("ix_chat_conversations_user_id"), table_name="chat_conversations")
    op.drop_table("chat_conversations")
    chat_role.drop(op.get_bind(), checkfirst=True)
