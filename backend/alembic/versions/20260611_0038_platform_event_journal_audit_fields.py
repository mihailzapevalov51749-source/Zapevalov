"""platform_event_journal audit fields

Revision ID: 20260611_0038
Revises: 20260611_0037
Create Date: 2026-06-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260611_0038"
down_revision: Union[str, None] = "20260611_0037"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("event_category", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("actor_email", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("target_type", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("target_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("target_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("tenant_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("company_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("metadata_json", sa.JSON(), nullable=True),
    )

    op.alter_column(
        "platform_event_journal_entries",
        "event_type",
        existing_type=sa.String(length=40),
        type_=sa.String(length=64),
        existing_nullable=False,
    )

    op.create_index(
        "ix_platform_event_journal_entries_event_category",
        "platform_event_journal_entries",
        ["event_category"],
        unique=False,
    )
    op.create_index(
        "ix_platform_event_journal_entries_tenant_id",
        "platform_event_journal_entries",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "ix_platform_event_journal_entries_company_id",
        "platform_event_journal_entries",
        ["company_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_platform_event_journal_entries_company_id",
        table_name="platform_event_journal_entries",
    )
    op.drop_index(
        "ix_platform_event_journal_entries_tenant_id",
        table_name="platform_event_journal_entries",
    )
    op.drop_index(
        "ix_platform_event_journal_entries_event_category",
        table_name="platform_event_journal_entries",
    )

    op.alter_column(
        "platform_event_journal_entries",
        "event_type",
        existing_type=sa.String(length=64),
        type_=sa.String(length=40),
        existing_nullable=False,
    )

    op.drop_column("platform_event_journal_entries", "metadata_json")
    op.drop_column("platform_event_journal_entries", "company_id")
    op.drop_column("platform_event_journal_entries", "tenant_id")
    op.drop_column("platform_event_journal_entries", "target_name")
    op.drop_column("platform_event_journal_entries", "target_id")
    op.drop_column("platform_event_journal_entries", "target_type")
    op.drop_column("platform_event_journal_entries", "actor_email")
    op.drop_column("platform_event_journal_entries", "event_category")
