"""Backfill legacy seed journal entries into platform/tenant scope.

Revision ID: 20260611_0041
Revises: 20260611_0040
Create Date: 2026-06-11

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.orm import Session

revision: str = "20260611_0041"
down_revision: Union[str, None] = "20260611_0040"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    try:
        from app.modules.platform_event_journal.models import PlatformEventJournalEntry
        from app.modules.platform_event_journal.seed_classification import (
            classify_seed_slug,
            resolve_dev_tenant_portal_id,
        )
        from app.modules.portals.models import Portal  # noqa: F401

        dev_tenant_id = resolve_dev_tenant_portal_id(session)

        entries = (
            session.query(PlatformEventJournalEntry)
            .filter(PlatformEventJournalEntry.scope == "legacy")
            .all()
        )

        for entry in entries:
            metadata = entry.metadata_json or {}
            legacy_type = str(metadata.get("legacy_event_type") or entry.event_type or "").strip()
            scope, _, tenant_id = classify_seed_slug(
                entry.slug,
                event_type=legacy_type,
                dev_tenant_id=dev_tenant_id,
            )
            entry.scope = scope
            entry.tenant_id = tenant_id

        session.commit()
    finally:
        session.close()


def downgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    try:
        from app.modules.platform_event_journal.models import PlatformEventJournalEntry
        from app.modules.platform_event_journal.seed_classification import (
            TENANT_STUDIO_SEED_SLUGS,
        )

        entries = session.query(PlatformEventJournalEntry).filter(
            PlatformEventJournalEntry.source == "seed",
        ).all()

        for entry in entries:
            if entry.slug in TENANT_STUDIO_SEED_SLUGS or entry.scope in {"platform", "tenant"}:
                entry.scope = "legacy"
                if entry.slug in TENANT_STUDIO_SEED_SLUGS:
                    entry.tenant_id = None

        session.commit()
    finally:
        session.close()
