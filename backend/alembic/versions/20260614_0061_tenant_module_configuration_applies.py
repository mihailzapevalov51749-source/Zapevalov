"""Create tenant module configuration applies audit table.

Revision ID: 20260614_0061
Revises: 20260614_0060
Create Date: 2026-06-14
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260614_0061"
down_revision: Union[str, None] = "20260614_0060"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "tenant_module_configuration_applies" not in table_names:
        op.create_table(
            "tenant_module_configuration_applies",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("offer_id", sa.Integer(), nullable=True),
            sa.Column("preview_id", sa.Integer(), nullable=True),
            sa.Column("diff_id", sa.Integer(), nullable=True),
            sa.Column("from_module_version", sa.String(length=32), nullable=False),
            sa.Column("to_module_version", sa.String(length=32), nullable=False),
            sa.Column("from_config_version", sa.String(length=32), nullable=False),
            sa.Column("to_config_version", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="started"),
            sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("applied_by", sa.Integer(), nullable=True),
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
            sa.ForeignKeyConstraint(
                ["preview_id"],
                ["tenant_module_update_previews.id"],
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(
                ["diff_id"],
                ["tenant_module_configuration_diffs.id"],
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(["applied_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_id",
            "tenant_module_configuration_applies",
            ["id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_tenant_id",
            "tenant_module_configuration_applies",
            ["tenant_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_module_key",
            "tenant_module_configuration_applies",
            ["module_key"],
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_offer_id",
            "tenant_module_configuration_applies",
            ["offer_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_preview_id",
            "tenant_module_configuration_applies",
            ["preview_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_diff_id",
            "tenant_module_configuration_applies",
            ["diff_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_status",
            "tenant_module_configuration_applies",
            ["status"],
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_started_at",
            "tenant_module_configuration_applies",
            ["started_at"],
        )
        op.create_index(
            "ix_tenant_module_configuration_applies_applied_by",
            "tenant_module_configuration_applies",
            ["applied_by"],
        )


def downgrade() -> None:
    op.drop_index(
        "ix_tenant_module_configuration_applies_applied_by",
        table_name="tenant_module_configuration_applies",
    )
    op.drop_index(
        "ix_tenant_module_configuration_applies_started_at",
        table_name="tenant_module_configuration_applies",
    )
    op.drop_index(
        "ix_tenant_module_configuration_applies_status",
        table_name="tenant_module_configuration_applies",
    )
    op.drop_index(
        "ix_tenant_module_configuration_applies_diff_id",
        table_name="tenant_module_configuration_applies",
    )
    op.drop_index(
        "ix_tenant_module_configuration_applies_preview_id",
        table_name="tenant_module_configuration_applies",
    )
    op.drop_index(
        "ix_tenant_module_configuration_applies_offer_id",
        table_name="tenant_module_configuration_applies",
    )
    op.drop_index(
        "ix_tenant_module_configuration_applies_module_key",
        table_name="tenant_module_configuration_applies",
    )
    op.drop_index(
        "ix_tenant_module_configuration_applies_tenant_id",
        table_name="tenant_module_configuration_applies",
    )
    op.drop_index(
        "ix_tenant_module_configuration_applies_id",
        table_name="tenant_module_configuration_applies",
    )
    op.drop_table("tenant_module_configuration_applies")
