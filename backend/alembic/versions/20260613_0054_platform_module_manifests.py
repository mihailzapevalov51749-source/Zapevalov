"""Create platform_module_manifests registry table and seed initial manifests.

Revision ID: 20260613_0054
Revises: 20260613_0053
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "20260613_0054"
down_revision: Union[str, None] = "20260613_0053"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "platform_module_manifests" not in table_names:
        op.create_table(
            "platform_module_manifests",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("manifest_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column("module_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column(
                "frontend_components",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "frontend_routes",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "backend_routers",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "backend_services",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "backend_models",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "db_tables",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "entry_points",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "permissions",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "dependencies",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "notification_targets",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            sa.Column(
                "settings_schema",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("release_notes", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=40), nullable=False, server_default="active"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(
                ["module_key"],
                ["platform_modules.module_key"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "module_key",
                "manifest_version",
                name="uq_platform_module_manifests_key_version",
            ),
        )
        op.create_index("ix_platform_module_manifests_id", "platform_module_manifests", ["id"])
        op.create_index(
            "ix_platform_module_manifests_module_key",
            "platform_module_manifests",
            ["module_key"],
        )
        op.create_index(
            "ix_platform_module_manifests_status",
            "platform_module_manifests",
            ["status"],
        )

    from app.db.session import SessionLocal
    from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests

    db = SessionLocal()
    try:
        seed_platform_module_manifests(db, commit=True)
    finally:
        db.close()


def downgrade() -> None:
    op.drop_index("ix_platform_module_manifests_status", table_name="platform_module_manifests")
    op.drop_index(
        "ix_platform_module_manifests_module_key",
        table_name="platform_module_manifests",
    )
    op.drop_index("ix_platform_module_manifests_id", table_name="platform_module_manifests")
    op.drop_table("platform_module_manifests")
