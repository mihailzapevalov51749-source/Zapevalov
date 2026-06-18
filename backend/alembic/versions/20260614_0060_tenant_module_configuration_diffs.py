"""Create tenant module configuration diff storage and preview integration.

Revision ID: 20260614_0060
Revises: 20260614_0059
Create Date: 2026-06-14
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "20260614_0060"
down_revision: Union[str, None] = "20260614_0059"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    preview_columns = (
        {column["name"] for column in inspector.get_columns("tenant_module_update_previews")}
        if "tenant_module_update_previews" in table_names
        else set()
    )

    if "affected_views" not in preview_columns:
        op.add_column(
            "tenant_module_update_previews",
            sa.Column(
                "affected_views",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
        )
    if "affected_rules" not in preview_columns:
        op.add_column(
            "tenant_module_update_previews",
            sa.Column(
                "affected_rules",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
        )
    if "affected_templates" not in preview_columns:
        op.add_column(
            "tenant_module_update_previews",
            sa.Column(
                "affected_templates",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
        )

    if "tenant_module_configuration_diffs" not in table_names:
        op.create_table(
            "tenant_module_configuration_diffs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("offer_id", sa.Integer(), nullable=False),
            sa.Column("release_id", sa.Integer(), nullable=True),
            sa.Column("from_module_version", sa.String(length=32), nullable=False),
            sa.Column("to_module_version", sa.String(length=32), nullable=False),
            sa.Column("from_config_version", sa.String(length=32), nullable=False),
            sa.Column("to_config_version", sa.String(length=32), nullable=False),
            sa.Column(
                "diff_payload",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("risk_level", sa.String(length=32), nullable=False, server_default="low"),
            sa.Column("generated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["module_key"],
                ["platform_modules.module_key"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["offer_id"],
                ["tenant_module_update_offers.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["release_id"],
                ["platform_releases.id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_tenant_module_configuration_diffs_id", "tenant_module_configuration_diffs", ["id"])
        op.create_index(
            "ix_tenant_module_configuration_diffs_tenant_id",
            "tenant_module_configuration_diffs",
            ["tenant_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_diffs_module_key",
            "tenant_module_configuration_diffs",
            ["module_key"],
        )
        op.create_index(
            "ix_tenant_module_configuration_diffs_offer_id",
            "tenant_module_configuration_diffs",
            ["offer_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_diffs_release_id",
            "tenant_module_configuration_diffs",
            ["release_id"],
        )
        op.create_index(
            "ix_tenant_module_configuration_diffs_risk_level",
            "tenant_module_configuration_diffs",
            ["risk_level"],
        )
        op.create_index(
            "ix_tenant_module_configuration_diffs_generated_at",
            "tenant_module_configuration_diffs",
            ["generated_at"],
        )


def downgrade() -> None:
    op.drop_index("ix_tenant_module_configuration_diffs_generated_at", table_name="tenant_module_configuration_diffs")
    op.drop_index("ix_tenant_module_configuration_diffs_risk_level", table_name="tenant_module_configuration_diffs")
    op.drop_index("ix_tenant_module_configuration_diffs_release_id", table_name="tenant_module_configuration_diffs")
    op.drop_index("ix_tenant_module_configuration_diffs_offer_id", table_name="tenant_module_configuration_diffs")
    op.drop_index("ix_tenant_module_configuration_diffs_module_key", table_name="tenant_module_configuration_diffs")
    op.drop_index("ix_tenant_module_configuration_diffs_tenant_id", table_name="tenant_module_configuration_diffs")
    op.drop_index("ix_tenant_module_configuration_diffs_id", table_name="tenant_module_configuration_diffs")
    op.drop_table("tenant_module_configuration_diffs")

    op.drop_column("tenant_module_update_previews", "affected_templates")
    op.drop_column("tenant_module_update_previews", "affected_rules")
    op.drop_column("tenant_module_update_previews", "affected_views")
