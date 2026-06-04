"""add quick_create to designer_field_definitions

Revision ID: 20260604_0013
Revises: 20260603_0012
Create Date: 2026-06-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260604_0013"
down_revision: Union[str, None] = "20260603_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE designer_field_definitions
        ADD COLUMN IF NOT EXISTS quick_create BOOLEAN NOT NULL DEFAULT false
        """
    )


def downgrade() -> None:
    op.drop_column("designer_field_definitions", "quick_create")
