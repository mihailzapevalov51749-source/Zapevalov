"""create designer_action_forms

Revision ID: 20260608_0022
Revises: 20260608_0021
Create Date: 2026-06-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260608_0022"
down_revision: Union[str, None] = "20260608_0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "designer_action_forms",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("object_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action_definition_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "submit_label",
            sa.String(length=128),
            nullable=False,
            server_default=sa.text("'Создать'"),
        ),
        sa.Column(
            "cancel_label",
            sa.String(length=128),
            nullable=False,
            server_default=sa.text("'Отмена'"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
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
            "action_definition_id",
            name="uq_designer_action_forms_action_definition_id",
        ),
    )
    op.create_index(
        "ix_designer_action_forms_tenant_object",
        "designer_action_forms",
        ["tenant_id", "object_type_id"],
        unique=False,
    )

    op.create_table(
        "designer_action_form_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("action_form_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_definition_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("label_override", sa.String(length=255), nullable=True),
        sa.Column("placeholder", sa.String(length=255), nullable=True),
        sa.Column("help_text", sa.Text(), nullable=True),
        sa.Column(
            "required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("100"),
        ),
        sa.Column(
            "is_visible",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
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
            ["action_form_id"],
            ["designer_action_forms.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["field_definition_id"],
            ["designer_field_definitions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "action_form_id",
            "field_definition_id",
            name="uq_designer_action_form_fields_form_field_definition",
        ),
    )
    op.create_index(
        "ix_designer_action_form_fields_action_form_id",
        "designer_action_form_fields",
        ["action_form_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_designer_action_form_fields_action_form_id",
        table_name="designer_action_form_fields",
    )
    op.drop_table("designer_action_form_fields")
    op.drop_index(
        "ix_designer_action_forms_tenant_object",
        table_name="designer_action_forms",
    )
    op.drop_table("designer_action_forms")
