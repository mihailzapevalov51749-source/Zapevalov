"""Create designer_system_menu_settings table.

Revision ID: 20260612_0045
Revises: 20260612_0044
Create Date: 2026-06-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260612_0045"
down_revision: Union[str, None] = "20260612_0044"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "designer_system_menu_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("portals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_key", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("icon", sa.String(length=255), nullable=True),
        sa.Column("icon_type", sa.String(length=50), nullable=True),
        sa.Column("icon_file_url", sa.String(length=1000), nullable=True),
        sa.Column("color", sa.String(length=50), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("is_visible", sa.Boolean(), nullable=True),
        sa.Column("is_bold", sa.Boolean(), nullable=True),
        sa.Column("is_italic", sa.Boolean(), nullable=True),
        sa.Column("is_expanded", sa.Boolean(), nullable=True),
        sa.Column("block_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "item_key", name="uq_designer_system_menu_tenant_item"),
    )
    op.create_index(
        "ix_designer_system_menu_settings_tenant_id",
        "designer_system_menu_settings",
        ["tenant_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_designer_system_menu_settings_tenant_id", table_name="designer_system_menu_settings")
    op.drop_table("designer_system_menu_settings")
