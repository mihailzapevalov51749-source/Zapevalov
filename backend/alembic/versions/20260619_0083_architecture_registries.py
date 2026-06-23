"""Architecture registry columns (WI-ARCH-REG-002).

Revision ID: 20260619_0083
Revises: 20260619_0082
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260619_0083"
down_revision = "20260619_0082"
branch_labels = None
depends_on = None

CATEGORY_TO_REGISTRY: dict[str, str] = {
    "contours": "runtime",
    "subsystems": "interface",
    "core": "core",
    "platform_components": "components",
    "platform_ui_elements": "interface",
    "modules": "modules",
    "services": "services",
    "data": "data",
    "decisions": "standards",
    "restrictions": "rules",
    "deviations": "overview",
}


def upgrade() -> None:
    op.add_column(
        "architecture_components",
        sa.Column("registry_key", sa.String(length=64), nullable=False, server_default="overview"),
    )
    op.add_column(
        "architecture_components",
        sa.Column("element_status", sa.String(length=32), nullable=False, server_default="active"),
    )
    op.add_column(
        "architecture_components",
        sa.Column("architecture_zone", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "architecture_components",
        sa.Column(
            "implementation_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "architecture_components",
        sa.Column(
            "documents_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "architecture_components",
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.create_index("ix_architecture_components_registry_key", "architecture_components", ["registry_key"])
    op.create_index("ix_architecture_components_element_status", "architecture_components", ["element_status"])

    bind = op.get_bind()
    for category_key, registry_key in CATEGORY_TO_REGISTRY.items():
        bind.execute(
            sa.text(
                """
                UPDATE architecture_components
                SET registry_key = :registry_key
                WHERE category_key = :category_key
                """
            ),
            {"registry_key": registry_key, "category_key": category_key},
        )


def downgrade() -> None:
    op.drop_index("ix_architecture_components_element_status", table_name="architecture_components")
    op.drop_index("ix_architecture_components_registry_key", table_name="architecture_components")
    op.drop_column("architecture_components", "metadata_json")
    op.drop_column("architecture_components", "documents_json")
    op.drop_column("architecture_components", "implementation_json")
    op.drop_column("architecture_components", "architecture_zone")
    op.drop_column("architecture_components", "element_status")
    op.drop_column("architecture_components", "registry_key")
