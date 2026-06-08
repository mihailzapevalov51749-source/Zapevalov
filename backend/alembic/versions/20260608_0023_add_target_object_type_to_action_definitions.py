"""add target_object_type_id to designer_action_definitions

Revision ID: 20260608_0023
Revises: 20260608_0022
Create Date: 2026-06-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260608_0023"
down_revision: Union[str, None] = "20260608_0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "designer_action_definitions",
        sa.Column(
            "target_object_type_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_designer_action_definitions_target_object_type_id",
        "designer_action_definitions",
        "designer_object_types",
        ["target_object_type_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_designer_action_definitions_target_object_type",
        "designer_action_definitions",
        ["tenant_id", "target_object_type_id"],
        unique=False,
    )

    op.execute(
        sa.text(
            """
            UPDATE designer_action_definitions
            SET target_object_type_id = object_type_id
            WHERE action_type_key = 'create_record'
              AND target_object_type_id IS NULL
            """,
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_designer_action_definitions_target_object_type",
        table_name="designer_action_definitions",
    )
    op.drop_constraint(
        "fk_designer_action_definitions_target_object_type_id",
        "designer_action_definitions",
        type_="foreignkey",
    )
    op.drop_column("designer_action_definitions", "target_object_type_id")
