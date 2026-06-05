"""runtime_entities.record_number

Revision ID: 20260605_0016
Revises: 20260605_0015
Create Date: 2026-06-05
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260605_0016"
down_revision: Union[str, None] = "20260605_0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE runtime_entities
        ADD COLUMN IF NOT EXISTS record_number INTEGER
        """
    )
    op.execute(
        """
        WITH numbered AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY tenant_id, object_type_key
                    ORDER BY created_at ASC, id ASC
                ) AS rn
            FROM runtime_entities
        )
        UPDATE runtime_entities AS entity
        SET record_number = numbered.rn
        FROM numbered
        WHERE entity.id = numbered.id
          AND entity.record_number IS NULL
        """
    )
    op.execute(
        """
        ALTER TABLE runtime_entities
        ALTER COLUMN record_number SET NOT NULL
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_runtime_entities_object_type_record_number
        ON runtime_entities (tenant_id, object_type_key, record_number)
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP INDEX IF EXISTS uq_runtime_entities_object_type_record_number"
    )
    op.drop_column("runtime_entities", "record_number")
