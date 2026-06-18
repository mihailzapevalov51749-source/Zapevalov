"""portal and platform public_slug

Revision ID: 20260616_0074
Revises: 20260616_0073
"""

from __future__ import annotations

import re

import sqlalchemy as sa
from alembic import op

revision = "20260616_0074"
down_revision = "20260616_0073"
branch_labels = None
depends_on = None

CYRILLIC_TO_LATIN = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def _slugify(value: str) -> str:
    transliterated = "".join(
        CYRILLIC_TO_LATIN.get(char, char) for char in str(value or "").strip().lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", transliterated)
    slug = re.sub(r"-+", "-", slug).strip("-")
    if not slug:
        return "company"
    return slug[:63].rstrip("-") or "company"


def upgrade() -> None:
    op.add_column(
        "portals",
        sa.Column("public_slug", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "portals",
        sa.Column(
            "public_slug_locked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index("ix_portals_public_slug", "portals", ["public_slug"], unique=True)

    op.add_column(
        "platform_settings",
        sa.Column("public_slug", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "platform_settings",
        sa.Column(
            "public_slug_locked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(
        "ix_platform_settings_public_slug",
        "platform_settings",
        ["public_slug"],
        unique=True,
    )

    connection = op.get_bind()
    portals = connection.execute(
        sa.text(
            "SELECT id, name, short_name, code FROM portals ORDER BY id ASC"
        )
    ).fetchall()
    used_slugs: set[str] = set()
    for portal_id, name, short_name, code in portals:
        source = short_name or name or code or f"tenant-{portal_id}"
        candidate = _slugify(source)
        if candidate in used_slugs:
            candidate = _slugify(f"{source}-{portal_id}")
        used_slugs.add(candidate)
        connection.execute(
            sa.text(
                "UPDATE portals SET public_slug = :slug WHERE id = :portal_id"
            ),
            {"slug": candidate, "portal_id": portal_id},
        )

    connection.execute(
        sa.text(
            """
            UPDATE platform_settings
            SET public_slug = :slug
            WHERE id = 1
            """
        ),
        {"slug": "yasnopro"},
    )


def downgrade() -> None:
    op.drop_index("ix_platform_settings_public_slug", table_name="platform_settings")
    op.drop_column("platform_settings", "public_slug_locked")
    op.drop_column("platform_settings", "public_slug")
    op.drop_index("ix_portals_public_slug", table_name="portals")
    op.drop_column("portals", "public_slug_locked")
    op.drop_column("portals", "public_slug")
