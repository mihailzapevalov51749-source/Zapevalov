"""create platform_event_journal_entries table

Revision ID: 20260610_0031
Revises: 20260610_0030
Create Date: 2026-06-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0031"
down_revision: Union[str, None] = "20260610_0030"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "platform_event_journal_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("author", sa.String(length=255), nullable=True),
        sa.Column("author_user_id", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_platform_event_journal_entries_id"),
        "platform_event_journal_entries",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_platform_event_journal_entries_slug"),
        "platform_event_journal_entries",
        ["slug"],
        unique=True,
    )
    op.create_index(
        op.f("ix_platform_event_journal_entries_event_type"),
        "platform_event_journal_entries",
        ["event_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_platform_event_journal_entries_status"),
        "platform_event_journal_entries",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_platform_event_journal_entries_status"),
        table_name="platform_event_journal_entries",
    )
    op.drop_index(
        op.f("ix_platform_event_journal_entries_event_type"),
        table_name="platform_event_journal_entries",
    )
    op.drop_index(
        op.f("ix_platform_event_journal_entries_slug"),
        table_name="platform_event_journal_entries",
    )
    op.drop_index(
        op.f("ix_platform_event_journal_entries_id"),
        table_name="platform_event_journal_entries",
    )
    op.drop_table("platform_event_journal_entries")
