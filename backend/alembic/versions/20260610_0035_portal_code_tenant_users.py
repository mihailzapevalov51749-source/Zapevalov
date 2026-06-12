"""portal code + tenant-scoped company users

Revision ID: 20260610_0035
Revises: 20260610_0034
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260610_0035"
down_revision = "20260610_0034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            ALTER TABLE portals
            ADD COLUMN IF NOT EXISTS code VARCHAR(64)
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_portals_code
            ON portals (code)
            WHERE code IS NOT NULL
            """
        )
    )
    op.execute(
        sa.text(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS tenant_id INTEGER
            REFERENCES portals(id) ON DELETE CASCADE
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_users_tenant_id
            ON users (tenant_id)
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO roles (name, description)
            SELECT 'company_superadmin', 'Company Superadmin'
            WHERE NOT EXISTS (
                SELECT 1 FROM roles WHERE name = 'company_superadmin'
            )
            """
        )
    )

    connection = op.get_bind()
    portals = connection.execute(sa.text("SELECT id, name FROM portals WHERE code IS NULL")).fetchall()
    used_codes: set[str] = set()
    for portal_id, name in portals:
        base = (
            str(name or "")
            .strip()
            .lower()
            .replace(" ", "_")
            .replace("-", "_")
        )
        base = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in base)
        base = "_".join(part for part in base.split("_") if part) or f"tenant_{portal_id}"
        if not base[0].isalpha():
            base = f"tenant_{portal_id}"
        candidate = base[:63]
        counter = 2
        while candidate in used_codes:
            suffix = f"_{counter}"
            candidate = f"{base[: max(3, 63 - len(suffix))].rstrip('_')}{suffix}"
            counter += 1
        used_codes.add(candidate)
        connection.execute(
            sa.text("UPDATE portals SET code = :code WHERE id = :portal_id"),
            {"code": candidate, "portal_id": portal_id},
        )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS ix_users_tenant_id"))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS tenant_id"))
    op.execute(sa.text("DROP INDEX IF EXISTS uq_portals_code"))
    op.execute(sa.text("ALTER TABLE portals DROP COLUMN IF EXISTS code"))
