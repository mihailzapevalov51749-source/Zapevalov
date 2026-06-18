"""Add personal_block_key to user_menu_preferences.

Revision ID: 20260613_0050
Revises: 20260613_0049
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260613_0050"
down_revision: Union[str, None] = "20260613_0049"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_menu_preferences",
        sa.Column("personal_block_key", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_menu_preferences", "personal_block_key")
