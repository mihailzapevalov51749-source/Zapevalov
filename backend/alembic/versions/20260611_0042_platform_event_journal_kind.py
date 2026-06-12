"""platform_event_journal journal_kind column

Revision ID: 20260611_0042
Revises: 20260611_0041
Create Date: 2026-06-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260611_0042"
down_revision: Union[str, None] = "20260611_0041"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("journal_kind", sa.String(length=40), nullable=True),
    )

    op.execute(
        """
        UPDATE platform_event_journal_entries
        SET journal_kind = 'platform_audit'
        WHERE journal_kind IS NULL
        """
    )

    op.alter_column(
        "platform_event_journal_entries",
        "journal_kind",
        existing_type=sa.String(length=40),
        nullable=False,
        server_default="platform_audit",
    )

    op.create_index(
        "ix_platform_event_journal_entries_journal_kind",
        "platform_event_journal_entries",
        ["journal_kind"],
        unique=False,
    )

    op.create_index(
        "ix_platform_event_journal_entries_journal_kind_tenant_id",
        "platform_event_journal_entries",
        ["journal_kind", "tenant_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_platform_event_journal_entries_journal_kind_tenant_id",
        table_name="platform_event_journal_entries",
    )
    op.drop_index(
        "ix_platform_event_journal_entries_journal_kind",
        table_name="platform_event_journal_entries",
    )
    op.drop_column("platform_event_journal_entries", "journal_kind")
