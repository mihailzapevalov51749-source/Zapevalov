"""Create tenant module configuration storage tables and backfill defaults.

Revision ID: 20260614_0059
Revises: 20260613_0058
Create Date: 2026-06-14
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "20260614_0059"
down_revision: Union[str, None] = "20260613_0058"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "tenant_module_configurations" not in table_names:
        op.create_table(
            "tenant_module_configurations",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("module_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column("config_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column("schema_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column(
                "settings",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column(
                "permissions",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column(
                "views",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column(
                "rules",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column(
                "templates",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("source", sa.String(length=64), nullable=False, server_default="manifest_defaults"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["module_key"],
                ["platform_modules.module_key"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "tenant_id",
                "module_key",
                name="uq_tenant_module_config_tenant_module",
            ),
        )
        op.create_index("ix_tenant_module_configurations_id", "tenant_module_configurations", ["id"])
        op.create_index(
            "ix_tenant_module_configurations_tenant_id",
            "tenant_module_configurations",
            ["tenant_id"],
        )
        op.create_index(
            "ix_tenant_module_configurations_module_key",
            "tenant_module_configurations",
            ["module_key"],
        )

    if "tenant_module_config_snapshots" not in table_names:
        op.create_table(
            "tenant_module_config_snapshots",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("snapshot_reason", sa.String(length=64), nullable=True),
            sa.Column("source_module_version", sa.String(length=32), nullable=True),
            sa.Column("target_module_version", sa.String(length=32), nullable=True),
            sa.Column("source_config_version", sa.String(length=32), nullable=True),
            sa.Column(
                "config_payload",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("offer_id", sa.Integer(), nullable=True),
            sa.Column("apply_id", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["module_key"],
                ["platform_modules.module_key"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["offer_id"],
                ["tenant_module_update_offers.id"],
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_tenant_module_config_snapshots_id", "tenant_module_config_snapshots", ["id"])
        op.create_index(
            "ix_tenant_module_config_snapshots_tenant_id",
            "tenant_module_config_snapshots",
            ["tenant_id"],
        )
        op.create_index(
            "ix_tenant_module_config_snapshots_module_key",
            "tenant_module_config_snapshots",
            ["module_key"],
        )

    from app.db.session import SessionLocal
    from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
    from app.modules.platform_modules.seed import seed_platform_modules
    from app.modules.tenant_module_configurations.backfill import backfill_tenant_module_configurations
    from app.modules.tenant_modules.backfill import backfill_tenant_modules

    db = SessionLocal()
    try:
        seed_platform_modules(db, commit=False)
        seed_platform_module_manifests(db, commit=False)
        backfill_tenant_modules(db, commit=False)
        backfill_tenant_module_configurations(db, commit=True)
    finally:
        db.close()


def downgrade() -> None:
    op.drop_index("ix_tenant_module_config_snapshots_module_key", table_name="tenant_module_config_snapshots")
    op.drop_index("ix_tenant_module_config_snapshots_tenant_id", table_name="tenant_module_config_snapshots")
    op.drop_index("ix_tenant_module_config_snapshots_id", table_name="tenant_module_config_snapshots")
    op.drop_table("tenant_module_config_snapshots")

    op.drop_index("ix_tenant_module_configurations_module_key", table_name="tenant_module_configurations")
    op.drop_index("ix_tenant_module_configurations_tenant_id", table_name="tenant_module_configurations")
    op.drop_index("ix_tenant_module_configurations_id", table_name="tenant_module_configurations")
    op.drop_table("tenant_module_configurations")
