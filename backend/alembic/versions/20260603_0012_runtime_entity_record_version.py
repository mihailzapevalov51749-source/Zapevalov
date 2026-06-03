"""runtime_entities.record_version

Revision ID: 20260603_0012
Revises: 20260602_0011
Create Date: 2026-06-03
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260603_0012"
down_revision: Union[str, None] = "20260602_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE runtime_entities
        ADD COLUMN IF NOT EXISTS record_version INTEGER NOT NULL DEFAULT 1
        """
    )


def downgrade() -> None:
    op.drop_column("runtime_entities", "record_version")
