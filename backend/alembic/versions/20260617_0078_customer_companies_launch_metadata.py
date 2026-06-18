"""Add launch metadata columns to customer_companies catalog.

Revision ID: 20260617_0078
Revises: 20260617_0077
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260617_0078"
down_revision: Union[str, None] = "20260617_0077"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE customer_companies
        ADD COLUMN IF NOT EXISTS home_page_id INTEGER NULL,
        ADD COLUMN IF NOT EXISTS frontend_base_url VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS api_base_url VARCHAR(255) NULL
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_customer_companies_home_page_id
        ON customer_companies (home_page_id)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_customer_companies_home_page_id")
    op.execute(
        """
        ALTER TABLE customer_companies
        DROP COLUMN IF EXISTS api_base_url,
        DROP COLUMN IF EXISTS frontend_base_url,
        DROP COLUMN IF EXISTS home_page_id
        """
    )
