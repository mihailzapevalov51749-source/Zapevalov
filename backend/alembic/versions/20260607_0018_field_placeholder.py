"""add placeholder to designer_field_definitions

Revision ID: 20260607_0018
Revises: 20260607_0017
Create Date: 2026-06-07

"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260607_0018"
down_revision: Union[str, None] = "20260607_0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE designer_field_definitions
        ADD COLUMN IF NOT EXISTS placeholder TEXT
        """
    )


def downgrade() -> None:
    op.drop_column("designer_field_definitions", "placeholder")
