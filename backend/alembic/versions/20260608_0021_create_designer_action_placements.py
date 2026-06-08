"""create designer_action_placements

Revision ID: 20260608_0021
Revises: 20260608_0020
Create Date: 2026-06-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260608_0021"
down_revision: Union[str, None] = "20260608_0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "designer_action_placements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("object_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action_definition_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("placement_key", sa.String(length=64), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("100"),
        ),
        sa.Column("label_override", sa.String(length=255), nullable=True),
        sa.Column("icon_key", sa.String(length=64), nullable=True),
        sa.Column("config_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "visibility_condition_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "enabled_condition_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["action_definition_id"],
            ["designer_action_definitions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["object_type_id"],
            ["designer_object_types.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tenant_id",
            "object_type_id",
            "action_definition_id",
            "placement_key",
            name="uq_designer_action_placements_tenant_object_action_placement",
        ),
    )
    op.create_index(
        "ix_designer_action_placements_tenant_object_placement_active",
        "designer_action_placements",
        ["tenant_id", "object_type_id", "placement_key", "is_active"],
        unique=False,
    )
    op.create_index(
        "ix_designer_action_placements_action_definition_id",
        "designer_action_placements",
        ["action_definition_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_designer_action_placements_action_definition_id",
        table_name="designer_action_placements",
    )
    op.drop_index(
        "ix_designer_action_placements_tenant_object_placement_active",
        table_name="designer_action_placements",
    )
    op.drop_table("designer_action_placements")
