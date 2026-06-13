"""Add tenant_id to chats for company-scoped participant isolation.

Revision ID: 20260613_0047
Revises: 20260612_0046
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260613_0047"
down_revision: Union[str, None] = "20260612_0046"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chats", sa.Column("tenant_id", sa.Integer(), nullable=True))
    op.create_index("ix_chats_tenant_id", "chats", ["tenant_id"], unique=False)

    op.execute(
        sa.text(
            """
            UPDATE chats AS c
            SET tenant_id = u.tenant_id
            FROM users AS u
            WHERE c.created_by_id = u.id
              AND u.tenant_id IS NOT NULL
              AND c.tenant_id IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_chats_tenant_id", table_name="chats")
    op.drop_column("chats", "tenant_id")
