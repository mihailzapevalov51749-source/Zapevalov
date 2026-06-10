"""plan_root_relation_key unique anchor registry

Revision ID: 20260610_0028
Revises: 20260610_0027
Create Date: 2026-06-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0028"
down_revision: Union[str, None] = "20260610_0027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "runtime_entities",
        sa.Column("plan_root_relation_key", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_runtime_entities_plan_root_relation_key",
        "runtime_entities",
        ["tenant_id", "object_type_key", "plan_root_relation_key"],
        unique=False,
    )

    op.execute(
        """
        UPDATE runtime_entities AS re
        SET plan_root_relation_key = substring(rev.value_json #>> '{}' FROM '#(.+)$')
        FROM runtime_entity_values AS rev
        WHERE rev.entity_id = re.id
          AND re.deleted_at IS NULL
          AND re.is_system = TRUE
          AND re.plan_root_relation_key IS NULL
          AND rev.value_json #>> '{}' LIKE '__plan_tree_root__#%'
        """
    )

    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY tenant_id, object_type_key, plan_root_relation_key
                    ORDER BY created_at ASC, record_number ASC, id ASC
                ) AS rn
            FROM runtime_entities
            WHERE deleted_at IS NULL
              AND plan_root_relation_key IS NOT NULL
              AND is_system = TRUE
        )
        UPDATE runtime_entities AS re
        SET deleted_at = NOW(), updated_at = NOW()
        FROM ranked
        WHERE re.id = ranked.id
          AND ranked.rn > 1
        """
    )

    op.execute(
        """
        CREATE UNIQUE INDEX uq_runtime_entities_active_plan_root_anchor
        ON runtime_entities (tenant_id, object_type_key, plan_root_relation_key)
        WHERE deleted_at IS NULL AND plan_root_relation_key IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_runtime_entities_active_plan_root_anchor")
    op.drop_index(
        "ix_runtime_entities_plan_root_relation_key",
        table_name="runtime_entities",
    )
    op.drop_column("runtime_entities", "plan_root_relation_key")
