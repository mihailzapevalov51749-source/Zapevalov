"""Create tenant_module_update_previews registry and generate initial previews.

Revision ID: 20260613_0058
Revises: 20260613_0057
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "20260613_0058"
down_revision: Union[str, None] = "20260613_0057"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "tenant_module_update_previews" not in table_names:
        op.create_table(
            "tenant_module_update_previews",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("offer_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("from_version", sa.String(length=32), nullable=False),
            sa.Column("to_version", sa.String(length=32), nullable=False),
            sa.Column("release_id", sa.Integer(), nullable=True),
            sa.Column("preview_status", sa.String(length=32), nullable=False, server_default="generated"),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("impact_analysis", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
            sa.Column("affected_components", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
            sa.Column("affected_routes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
            sa.Column("affected_tables", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
            sa.Column("affected_permissions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
            sa.Column("affected_settings", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
            sa.Column("affected_dependencies", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
            sa.Column("risk_level", sa.String(length=32), nullable=False, server_default="low"),
            sa.Column("generated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["offer_id"], ["tenant_module_update_offers.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["module_key"],
                ["platform_modules.module_key"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(["release_id"], ["platform_releases.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_tenant_module_update_previews_id", "tenant_module_update_previews", ["id"])
        op.create_index(
            "ix_tenant_module_update_previews_tenant_id",
            "tenant_module_update_previews",
            ["tenant_id"],
        )
        op.create_index(
            "ix_tenant_module_update_previews_offer_id",
            "tenant_module_update_previews",
            ["offer_id"],
        )
        op.create_index(
            "ix_tenant_module_update_previews_module_key",
            "tenant_module_update_previews",
            ["module_key"],
        )
        op.create_index(
            "ix_tenant_module_update_previews_release_id",
            "tenant_module_update_previews",
            ["release_id"],
        )
        op.create_index(
            "ix_tenant_module_update_previews_preview_status",
            "tenant_module_update_previews",
            ["preview_status"],
        )
        op.create_index(
            "ix_tenant_module_update_previews_risk_level",
            "tenant_module_update_previews",
            ["risk_level"],
        )

    from app.db.session import SessionLocal
    from app.modules.tenant_module_update_previews.generator import generate_previews_for_all_tenants

    db = SessionLocal()
    try:
        generate_previews_for_all_tenants(db, commit=True)
    finally:
        db.close()


def downgrade() -> None:
    op.drop_index("ix_tenant_module_update_previews_risk_level", table_name="tenant_module_update_previews")
    op.drop_index("ix_tenant_module_update_previews_preview_status", table_name="tenant_module_update_previews")
    op.drop_index("ix_tenant_module_update_previews_release_id", table_name="tenant_module_update_previews")
    op.drop_index("ix_tenant_module_update_previews_module_key", table_name="tenant_module_update_previews")
    op.drop_index("ix_tenant_module_update_previews_offer_id", table_name="tenant_module_update_previews")
    op.drop_index("ix_tenant_module_update_previews_tenant_id", table_name="tenant_module_update_previews")
    op.drop_index("ix_tenant_module_update_previews_id", table_name="tenant_module_update_previews")
    op.drop_table("tenant_module_update_previews")
