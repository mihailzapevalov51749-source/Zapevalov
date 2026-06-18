"""Create tenant_runtime_menu_settings and user_menu_preferences tables.

Revision ID: 20260613_0049
Revises: 20260613_0048
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260613_0049"
down_revision: Union[str, None] = "20260613_0048"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenant_runtime_menu_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("portals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_key", sa.String(length=120), nullable=False),
        sa.Column("navigation_item_id", sa.Integer(), nullable=True),
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
        sa.UniqueConstraint("tenant_id", "item_key", name="uq_tenant_runtime_menu_tenant_item"),
    )
    op.create_index(
        "ix_tenant_runtime_menu_settings_tenant_id",
        "tenant_runtime_menu_settings",
        ["tenant_id"],
    )

    op.create_table(
        "user_menu_preferences",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("portals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_key", sa.String(length=120), nullable=False),
        sa.Column("navigation_item_id", sa.Integer(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("is_hidden", sa.Boolean(), nullable=True),
        sa.Column("color", sa.String(length=50), nullable=True),
        sa.Column("is_bold", sa.Boolean(), nullable=True),
        sa.Column("is_collapsed", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "tenant_id", "item_key", name="uq_user_menu_pref_user_tenant_item"),
    )
    op.create_index("ix_user_menu_preferences_user_id", "user_menu_preferences", ["user_id"])
    op.create_index("ix_user_menu_preferences_tenant_id", "user_menu_preferences", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_user_menu_preferences_tenant_id", table_name="user_menu_preferences")
    op.drop_index("ix_user_menu_preferences_user_id", table_name="user_menu_preferences")
    op.drop_table("user_menu_preferences")
    op.drop_index("ix_tenant_runtime_menu_settings_tenant_id", table_name="tenant_runtime_menu_settings")
    op.drop_table("tenant_runtime_menu_settings")
