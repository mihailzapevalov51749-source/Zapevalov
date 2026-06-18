"""Retarget tenant_update_offers.release_id to platform_release_packages.

Revision ID: 20260616_0073
Revises: 20260616_0072
Create Date: 2026-06-16
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260616_0073"
down_revision: Union[str, None] = "20260616_0072"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_NAME = "tenant_update_offers_release_id_fkey"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tenant_update_offers" not in inspector.get_table_names():
        return
    if "platform_release_packages" not in inspector.get_table_names():
        return

    op.execute(
        sa.text(
            """
            DELETE FROM tenant_update_offers
            WHERE release_id NOT IN (SELECT id FROM platform_release_packages)
            """
        )
    )

    existing_fks = {
        fk["name"]
        for fk in inspector.get_foreign_keys("tenant_update_offers")
        if fk.get("name")
    }
    if FK_NAME in existing_fks:
        op.drop_constraint(FK_NAME, "tenant_update_offers", type_="foreignkey")

    op.create_foreign_key(
        FK_NAME,
        "tenant_update_offers",
        "platform_release_packages",
        ["release_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "tenant_update_offers" not in inspector.get_table_names():
        return

    existing_fks = {
        fk["name"]
        for fk in inspector.get_foreign_keys("tenant_update_offers")
        if fk.get("name")
    }
    if FK_NAME in existing_fks:
        op.drop_constraint(FK_NAME, "tenant_update_offers", type_="foreignkey")

    op.execute(
        sa.text(
            """
            DELETE FROM tenant_update_offers
            WHERE release_id NOT IN (SELECT id FROM platform_releases)
            """
        )
    )

    op.create_foreign_key(
        FK_NAME,
        "tenant_update_offers",
        "platform_releases",
        ["release_id"],
        ["id"],
        ondelete="CASCADE",
    )
