"""platform_event_journal scope column

Revision ID: 20260611_0040
Revises: 20260611_0039
Create Date: 2026-06-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260611_0040"
down_revision: Union[str, None] = "20260611_0039"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "platform_event_journal_entries",
        sa.Column("scope", sa.String(length=20), nullable=True),
    )

    op.execute(
        """
        UPDATE platform_event_journal_entries
        SET scope = 'legacy'
        WHERE source = 'seed'
           OR event_type = 'legacy'
        """
    )

    op.execute(
        """
        UPDATE platform_event_journal_entries
        SET scope = 'platform'
        WHERE scope IS NULL
        """
    )

    op.alter_column(
        "platform_event_journal_entries",
        "scope",
        existing_type=sa.String(length=20),
        nullable=False,
        server_default="platform",
    )

    op.create_index(
        "ix_platform_event_journal_entries_scope",
        "platform_event_journal_entries",
        ["scope"],
        unique=False,
    )

    op.create_index(
        "ix_platform_event_journal_entries_scope_tenant_id",
        "platform_event_journal_entries",
        ["scope", "tenant_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_platform_event_journal_entries_scope_tenant_id",
        table_name="platform_event_journal_entries",
    )
    op.drop_index(
        "ix_platform_event_journal_entries_scope",
        table_name="platform_event_journal_entries",
    )
    op.drop_column("platform_event_journal_entries", "scope")
