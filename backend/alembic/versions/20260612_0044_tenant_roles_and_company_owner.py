"""Tenant system roles and company owner flag.

Revision ID: 20260612_0044
Revises: 20260611_0043
Create Date: 2026-06-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260612_0044"
down_revision: Union[str, None] = "20260611_0043"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_company_owner BOOLEAN NOT NULL DEFAULT false
            """
        )
    )

    conn = op.get_bind()

    for role_name, description in (
        ("superadmin", "Полный доступ внутри компании, включая администрирование."),
        ("admin", "Доступ к Designer Studio и рабочим функциям без администрирования компании."),
        ("user", "Доступ только к разрешённым рабочим пространствам и объектам."),
    ):
        conn.execute(
            sa.text(
                """
                INSERT INTO roles (name, description)
                SELECT :name, :description
                WHERE NOT EXISTS (
                    SELECT 1 FROM roles WHERE name = :name
                )
                """
            ),
            {"name": role_name, "description": description},
        )
        conn.execute(
            sa.text("UPDATE roles SET description = :description WHERE name = :name"),
            {"name": role_name, "description": description},
        )

    superadmin_row = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'superadmin'")
    ).fetchone()
    superadmin_role_id = int(superadmin_row[0]) if superadmin_row is not None else None

    legacy_users = conn.execute(
        sa.text(
            """
            SELECT u.id, u.tenant_id
            FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE r.name = 'company_superadmin'
              AND u.tenant_id IS NOT NULL
            ORDER BY u.tenant_id ASC, u.id ASC
            """
        )
    ).fetchall()

    seen_tenants: set[int] = set()
    if superadmin_role_id is not None:
        for user_id, tenant_id in legacy_users:
            if tenant_id is None:
                continue

            is_owner = tenant_id not in seen_tenants
            if is_owner:
                seen_tenants.add(int(tenant_id))

            conn.execute(
                sa.text(
                    """
                    UPDATE users
                    SET role_id = :role_id,
                        is_company_owner = :is_owner
                    WHERE id = :user_id
                    """
                ),
                {
                    "role_id": superadmin_role_id,
                    "is_owner": is_owner,
                    "user_id": user_id,
                },
            )

    conn.execute(
        sa.text(
            """
            UPDATE tenant_user_memberships
            SET role_key = 'superadmin'
            WHERE role_key IN ('company_superadmin', 'company_super_admin')
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS is_company_owner"))
