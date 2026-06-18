"""Create tenant module configuration rollbacks audit table.

Revision ID: 20260614_0062
Revises: 20260614_0061
Create Date: 2026-06-14
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260614_0062"
down_revision: Union[str, None] = "20260614_0061"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "tenant_module_configuration_rollbacks" not in table_names:
        op.create_table(
            "tenant_module_configuration_rollbacks",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("apply_id", sa.Integer(), nullable=True),
            sa.Column("snapshot_id", sa.Integer(), nullable=True),
            sa.Column("from_module_version", sa.String(length=32), nullable=False),
            sa.Column("to_module_version", sa.String(length=32), nullable=False),
            sa.Column("from_config_version", sa.String(length=32), nullable=False),
            sa.Column("to_config_version", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="started"),
            sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("rolled_back_by", sa.Integer(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["module_key"],
                ["platform_modules.module_key"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["apply_id"],
                ["tenant_module_configuration_applies.id"],
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(
                ["snapshot_id"],
                ["tenant_module_config_snapshots.id"],
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(["rolled_back_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_tenant_module_configuration_rollbacks_id",
            "tenant_module_configuration_rollbacks",
            ["id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_rollbacks_tenant_id",
            "tenant_module_configuration_rollbacks",
            ["tenant_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_rollbacks_module_key",
            "tenant_module_configuration_rollbacks",
            ["module_key"],
        )
        op.create_index(
            "ix_tenant_module_configuration_rollbacks_apply_id",
            "tenant_module_configuration_rollbacks",
            ["apply_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_rollbacks_snapshot_id",
            "tenant_module_configuration_rollbacks",
            ["snapshot_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_rollbacks_status",
            "tenant_module_configuration_rollbacks",
            ["status"],
        )
        op.create_index(
            "ix_tenant_module_configuration_rollbacks_started_at",
            "tenant_module_configuration_rollbacks",
            ["started_at"],
        )
        op.create_index(
            "ix_tenant_module_configuration_rollbacks_rolled_back_by",
            "tenant_module_configuration_rollbacks",
            ["rolled_back_by"],
        )

    apply_columns = {
        column["name"] for column in inspector.get_columns("tenant_module_configuration_applies")
    }
    if "rollback_id" not in apply_columns:
        op.add_column(
            "tenant_module_configuration_applies",
            sa.Column("rollback_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_tenant_module_configuration_applies_rollback_id",
            "tenant_module_configuration_applies",
            "tenant_module_configuration_rollbacks",
            ["rollback_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_rollback_id",
            "tenant_module_configuration_applies",
            ["rollback_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    apply_columns = {
        column["name"] for column in inspector.get_columns("tenant_module_configuration_applies")
    }
    if "rollback_id" in apply_columns:
        op.drop_index(
            "ix_tenant_module_configuration_applies_rollback_id",
            table_name="tenant_module_configuration_applies",
        )
        op.drop_constraint(
            "fk_tenant_module_configuration_applies_rollback_id",
            "tenant_module_configuration_applies",
            type_="foreignkey",
        )
        op.drop_column("tenant_module_configuration_applies", "rollback_id")

    if "tenant_module_configuration_rollbacks" in table_names:
        op.drop_index(
            "ix_tenant_module_configuration_rollbacks_rolled_back_by",
            table_name="tenant_module_configuration_rollbacks",
        )
        op.drop_index(
            "ix_tenant_module_configuration_rollbacks_started_at",
            table_name="tenant_module_configuration_rollbacks",
        )
        op.drop_index(
            "ix_tenant_module_configuration_rollbacks_status",
            table_name="tenant_module_configuration_rollbacks",
        )
        op.drop_index(
            "ix_tenant_module_configuration_rollbacks_snapshot_id",
            table_name="tenant_module_configuration_rollbacks",
        )
        op.drop_index(
            "ix_tenant_module_configuration_rollbacks_apply_id",
            table_name="tenant_module_configuration_rollbacks",
        )
        op.drop_index(
            "ix_tenant_module_configuration_rollbacks_module_key",
            table_name="tenant_module_configuration_rollbacks",
        )
        op.drop_index(
            "ix_tenant_module_configuration_rollbacks_tenant_id",
            table_name="tenant_module_configuration_rollbacks",
        )
        op.drop_index(
            "ix_tenant_module_configuration_rollbacks_id",
            table_name="tenant_module_configuration_rollbacks",
        )
        op.drop_table("tenant_module_configuration_rollbacks")
