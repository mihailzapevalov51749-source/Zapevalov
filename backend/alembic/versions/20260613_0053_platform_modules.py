"""Create platform_modules registry table and seed initial catalog.

Revision ID: 20260613_0053
Revises: 20260613_0052
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260613_0053"
down_revision: Union[str, None] = "20260613_0052"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "platform_modules" not in table_names:
        op.create_table(
            "platform_modules",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("module_type", sa.String(length=40), nullable=False),
            sa.Column("status", sa.String(length=40), nullable=False),
            sa.Column("version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column("entry_system_key", sa.String(length=120), nullable=True),
            sa.Column("entry_route", sa.String(length=255), nullable=True),
            sa.Column("is_runtime", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column(
                "is_tenant_installable",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column(
                "is_enabled_by_default",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("is_core", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("module_key"),
        )
        op.create_index("ix_platform_modules_id", "platform_modules", ["id"])
        op.create_index("ix_platform_modules_module_key", "platform_modules", ["module_key"])
        op.create_index("ix_platform_modules_module_type", "platform_modules", ["module_type"])
        op.create_index("ix_platform_modules_status", "platform_modules", ["status"])
        op.create_index(
            "ix_platform_modules_entry_system_key",
            "platform_modules",
            ["entry_system_key"],
        )

    from app.modules.platform_modules.seed import seed_platform_modules
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        seed_platform_modules(db, commit=True)
    finally:
        db.close()


def downgrade() -> None:
    op.drop_index("ix_platform_modules_entry_system_key", table_name="platform_modules")
    op.drop_index("ix_platform_modules_status", table_name="platform_modules")
    op.drop_index("ix_platform_modules_module_type", table_name="platform_modules")
    op.drop_index("ix_platform_modules_module_key", table_name="platform_modules")
    op.drop_index("ix_platform_modules_id", table_name="platform_modules")
    op.drop_table("platform_modules")
