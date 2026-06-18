"""customer_companies catalog fields for platform client registry

Revision ID: 20260617_0077
Revises: 20260616_0076
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260617_0077"
down_revision: Union[str, None] = "20260616_0076"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE customer_companies
        ADD COLUMN IF NOT EXISTS portal_id INTEGER NULL,
        ADD COLUMN IF NOT EXISTS database_name VARCHAR(128) NULL,
        ADD COLUMN IF NOT EXISTS code VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS tenant_type VARCHAR(32) NULL,
        ADD COLUMN IF NOT EXISTS environment_role VARCHAR(32) NULL,
        ADD COLUMN IF NOT EXISTS tenant_status VARCHAR(32) NULL,
        ADD COLUMN IF NOT EXISTS original_name VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS short_name VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS public_slug VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS template_version VARCHAR(32) NULL,
        ADD COLUMN IF NOT EXISTS platform_version VARCHAR(64) NULL
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_companies_database_portal
        ON customer_companies (database_name, portal_id)
        WHERE database_name IS NOT NULL AND portal_id IS NOT NULL
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_customer_companies_portal_id
        ON customer_companies (portal_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_customer_companies_code
        ON customer_companies (code)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_customer_companies_code")
    op.execute("DROP INDEX IF EXISTS ix_customer_companies_portal_id")
    op.execute("DROP INDEX IF EXISTS uq_customer_companies_database_portal")
    op.execute(
        """
        ALTER TABLE customer_companies
        DROP COLUMN IF EXISTS platform_version,
        DROP COLUMN IF EXISTS template_version,
        DROP COLUMN IF EXISTS public_slug,
        DROP COLUMN IF EXISTS short_name,
        DROP COLUMN IF EXISTS original_name,
        DROP COLUMN IF EXISTS tenant_status,
        DROP COLUMN IF EXISTS environment_role,
        DROP COLUMN IF EXISTS tenant_type,
        DROP COLUMN IF EXISTS code,
        DROP COLUMN IF EXISTS database_name,
        DROP COLUMN IF EXISTS portal_id
        """
    )
