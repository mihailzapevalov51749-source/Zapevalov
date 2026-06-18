"""Create tenant_module_update_offers registry and generate initial offers.

Revision ID: 20260613_0057
Revises: 20260613_0056
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260613_0057"
down_revision: Union[str, None] = "20260613_0056"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "tenant_module_update_offers" not in table_names:
        op.create_table(
            "tenant_module_update_offers",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("from_version", sa.String(length=32), nullable=False),
            sa.Column("to_version", sa.String(length=32), nullable=False),
            sa.Column("release_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="available"),
            sa.Column("offered_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("applied_at", sa.DateTime(), nullable=True),
            sa.Column("skipped_at", sa.DateTime(), nullable=True),
            sa.Column("change_summary", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["module_key"],
                ["platform_modules.module_key"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(["release_id"], ["platform_releases.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_tenant_module_update_offers_id", "tenant_module_update_offers", ["id"])
        op.create_index(
            "ix_tenant_module_update_offers_tenant_id",
            "tenant_module_update_offers",
            ["tenant_id"],
        )
        op.create_index(
            "ix_tenant_module_update_offers_module_key",
            "tenant_module_update_offers",
            ["module_key"],
        )
        op.create_index(
            "ix_tenant_module_update_offers_release_id",
            "tenant_module_update_offers",
            ["release_id"],
        )
        op.create_index(
            "ix_tenant_module_update_offers_status",
            "tenant_module_update_offers",
            ["status"],
        )

    from app.db.session import SessionLocal
    from app.modules.tenant_module_update_offers.generator import generate_offers_for_all_tenants

    db = SessionLocal()
    try:
        generate_offers_for_all_tenants(db, commit=True)
    finally:
        db.close()


def downgrade() -> None:
    op.drop_index("ix_tenant_module_update_offers_status", table_name="tenant_module_update_offers")
    op.drop_index("ix_tenant_module_update_offers_release_id", table_name="tenant_module_update_offers")
    op.drop_index("ix_tenant_module_update_offers_module_key", table_name="tenant_module_update_offers")
    op.drop_index("ix_tenant_module_update_offers_tenant_id", table_name="tenant_module_update_offers")
    op.drop_index("ix_tenant_module_update_offers_id", table_name="tenant_module_update_offers")
    op.drop_table("tenant_module_update_offers")
