"""create customer_companies

Revision ID: 20260609_0026
Revises: 20260609_0025
Create Date: 2026-06-09

"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260609_0026"
down_revision: Union[str, None] = "20260609_0025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_companies (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            primary_portal_id INTEGER NULL REFERENCES portals(id) ON DELETE SET NULL,
            users_limit INTEGER NOT NULL DEFAULT 10,
            sales_owner_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            support_owner_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_customer_companies_status
        ON customer_companies (status)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_customer_companies_primary_portal_id
        ON customer_companies (primary_portal_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_customer_companies_sales_owner_id
        ON customer_companies (sales_owner_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_customer_companies_support_owner_id
        ON customer_companies (support_owner_id)
        """
    )


def downgrade() -> None:
    op.drop_index("ix_customer_companies_support_owner_id", table_name="customer_companies")
    op.drop_index("ix_customer_companies_sales_owner_id", table_name="customer_companies")
    op.drop_index("ix_customer_companies_primary_portal_id", table_name="customer_companies")
    op.drop_index("ix_customer_companies_status", table_name="customer_companies")
    op.drop_table("customer_companies")
