"""Drop local portal FK from customer_companies catalog (cross-database portal refs).

Revision ID: 20260617_0080
Revises: 20260617_0079
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260617_0080"
down_revision: Union[str, None] = "20260617_0079"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE customer_companies
        DROP CONSTRAINT IF EXISTS customer_companies_primary_portal_id_fkey
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE customer_companies
        ADD CONSTRAINT customer_companies_primary_portal_id_fkey
        FOREIGN KEY (primary_portal_id) REFERENCES portals(id) ON DELETE SET NULL
        """
    )
