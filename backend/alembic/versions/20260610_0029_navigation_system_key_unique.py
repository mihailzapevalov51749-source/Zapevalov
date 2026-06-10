"""navigation_items partial unique index on portal_id + system_key

Revision ID: 20260610_0029
Revises: 20260610_0028
Create Date: 2026-06-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0029"
down_revision: Union[str, None] = "20260610_0028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY portal_id, system_key
                    ORDER BY id ASC
                ) AS rn
            FROM navigation_items
            WHERE deleted_at IS NULL
              AND system_key IS NOT NULL
              AND system_key <> ''
        )
        UPDATE navigation_items AS ni
        SET deleted_at = TIMEZONE('utc', NOW())
        FROM ranked
        WHERE ni.id = ranked.id
          AND ranked.rn > 1
        """
    )

    op.create_index(
        "uq_navigation_items_portal_system_key_active",
        "navigation_items",
        ["portal_id", "system_key"],
        unique=True,
        postgresql_where=sa.text(
            "deleted_at IS NULL AND system_key IS NOT NULL AND system_key <> ''"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_navigation_items_portal_system_key_active",
        table_name="navigation_items",
    )
