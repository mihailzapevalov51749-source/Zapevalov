"""runtime_entities.is_system for platform System Records

Revision ID: 20260610_0027
Revises: 20260609_0026
Create Date: 2026-06-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0027"
down_revision: Union[str, None] = "20260609_0026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "runtime_entities",
        sa.Column(
            "is_system",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_runtime_entities_tenant_object_type_is_system",
        "runtime_entities",
        ["tenant_id", "object_type_key", "is_system"],
        unique=False,
    )
    op.execute(
        """
        UPDATE runtime_entities AS re
        SET is_system = TRUE
        FROM runtime_entity_values AS rev
        WHERE rev.entity_id = re.id
          AND rev.tenant_id = re.tenant_id
          AND re.deleted_at IS NULL
          AND rev.value_json #>> '{}' LIKE '__plan_tree_root__%'
        """
    )


def downgrade() -> None:
    op.drop_index(
        "ix_runtime_entities_tenant_object_type_is_system",
        table_name="runtime_entities",
    )
    op.drop_column("runtime_entities", "is_system")
