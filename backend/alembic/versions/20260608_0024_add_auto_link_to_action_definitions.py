"""add auto_link fields to designer_action_definitions

Revision ID: 20260608_0024
Revises: 20260608_0023
Create Date: 2026-06-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260608_0024"
down_revision: Union[str, None] = "20260608_0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "designer_action_definitions",
        sa.Column(
            "auto_link_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "designer_action_definitions",
        sa.Column(
            "auto_link_relation_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_designer_action_definitions_auto_link_relation_id",
        "designer_action_definitions",
        "designer_relation_definitions",
        ["auto_link_relation_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_designer_action_definitions_auto_link_relation",
        "designer_action_definitions",
        ["tenant_id", "auto_link_relation_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_designer_action_definitions_auto_link_relation",
        table_name="designer_action_definitions",
    )
    op.drop_constraint(
        "fk_designer_action_definitions_auto_link_relation_id",
        "designer_action_definitions",
        type_="foreignkey",
    )
    op.drop_column("designer_action_definitions", "auto_link_relation_id")
    op.drop_column("designer_action_definitions", "auto_link_enabled")
