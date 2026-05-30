"""add object_type_id to navigation_items

Revision ID: 20250528_0009
Revises: 20250528_0008
Create Date: 2025-05-28

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20250528_0009"
down_revision: Union[str, None] = "20250528_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "navigation_items",
        sa.Column(
            "object_type_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_navigation_items_object_type_id",
        "navigation_items",
        "designer_object_types",
        ["object_type_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "uq_navigation_items_portal_scope_object_type",
        "navigation_items",
        ["portal_id", "menu_scope", "object_type_id"],
        unique=True,
        postgresql_where=sa.text("object_type_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_navigation_items_portal_scope_object_type",
        table_name="navigation_items",
    )
    op.drop_constraint(
        "fk_navigation_items_object_type_id",
        "navigation_items",
        type_="foreignkey",
    )
    op.drop_column("navigation_items", "object_type_id")
