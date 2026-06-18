"""Create tenant_modules registry table and backfill from runtime navigation.

Revision ID: 20260613_0055
Revises: 20260613_0054
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260613_0055"
down_revision: Union[str, None] = "20260613_0054"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "tenant_modules" not in table_names:
        op.create_table(
            "tenant_modules",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("portal_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("installed_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("installed_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("source", sa.String(length=64), nullable=False, server_default="backfill"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["portal_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["module_key"],
                ["platform_modules.module_key"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("tenant_id", "module_key", name="uq_tenant_modules_tenant_module"),
        )
        op.create_index("ix_tenant_modules_id", "tenant_modules", ["id"])
        op.create_index("ix_tenant_modules_tenant_id", "tenant_modules", ["tenant_id"])
        op.create_index("ix_tenant_modules_portal_id", "tenant_modules", ["portal_id"])
        op.create_index("ix_tenant_modules_module_key", "tenant_modules", ["module_key"])

    from app.db.session import SessionLocal
    from app.modules.tenant_modules.backfill import backfill_tenant_modules

    db = SessionLocal()
    try:
        backfill_tenant_modules(db, commit=True)
    finally:
        db.close()


def downgrade() -> None:
    op.drop_index("ix_tenant_modules_module_key", table_name="tenant_modules")
    op.drop_index("ix_tenant_modules_portal_id", table_name="tenant_modules")
    op.drop_index("ix_tenant_modules_tenant_id", table_name="tenant_modules")
    op.drop_index("ix_tenant_modules_id", table_name="tenant_modules")
    op.drop_table("tenant_modules")
