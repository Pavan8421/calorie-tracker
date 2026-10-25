"""add import_jobs and food_entries.import_job_id

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-10-25 12:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d4e5f6a7b8c9"
down_revision: str | None = "c3d4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

import_status = postgresql.ENUM(
    "pending",
    "processing",
    "preview_ready",
    "completed",
    "failed",
    name="import_status",
    create_type=False,
)


def upgrade() -> None:
    import_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "import_jobs",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_data", sa.LargeBinary(), nullable=True),
        sa.Column("date_format", sa.String(length=3), server_default="DMY", nullable=False),
        sa.Column(
            "status",
            import_status,
            server_default="pending",
            nullable=False,
        ),
        sa.Column("parsed_rows", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("imported_count", sa.Integer(), server_default="0", nullable=False),
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
    op.create_index(op.f("ix_import_jobs_user_id"), "import_jobs", ["user_id"], unique=False)
    op.create_index(
        "ix_import_jobs_user_created",
        "import_jobs",
        ["user_id", "created_at"],
        unique=False,
    )

    op.add_column(
        "food_entries",
        sa.Column("import_job_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        op.f("ix_food_entries_import_job_id"),
        "food_entries",
        ["import_job_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_food_entries_import_job_id",
        "food_entries",
        "import_jobs",
        ["import_job_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_food_entries_import_job_id", "food_entries", type_="foreignkey")
    op.drop_index(op.f("ix_food_entries_import_job_id"), table_name="food_entries")
    op.drop_column("food_entries", "import_job_id")

    op.drop_index("ix_import_jobs_user_created", table_name="import_jobs")
    op.drop_index(op.f("ix_import_jobs_user_id"), table_name="import_jobs")
    op.drop_table("import_jobs")

    import_status.drop(op.get_bind(), checkfirst=True)
