"""Backfill journal_kind and reclassify development events into DEV journal.

Revision ID: 20260611_0043
Revises: 20260611_0042
Create Date: 2026-06-11

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.orm import Session

revision: str = "20260611_0043"
down_revision: Union[str, None] = "20260611_0042"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    try:
        from app.modules.platform_event_journal.journal_kind_classification import (
            classify_existing_entry,
            recode_platform_settings_entry,
        )
        from app.modules.platform_event_journal.models import PlatformEventJournalEntry
        from app.modules.platform_event_journal.seed_classification import (
            resolve_dev_tenant_portal_id,
        )
        from app.modules.portals.models import Portal  # noqa: F401

        dev_tenant_id = resolve_dev_tenant_portal_id(session)
        entries = session.query(PlatformEventJournalEntry).all()

        for entry in entries:
            scope, journal_kind, tenant_id = classify_existing_entry(
                entry,
                dev_tenant_id=dev_tenant_id,
            )
            entry.scope = scope
            entry.journal_kind = journal_kind
            entry.tenant_id = tenant_id
            recode_platform_settings_entry(entry)

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
            classify_seed_slug_legacy,
            resolve_dev_tenant_portal_id,
        )

        dev_tenant_id = resolve_dev_tenant_portal_id(session)
        entries = session.query(PlatformEventJournalEntry).all()

        for entry in entries:
            if entry.source == "seed":
                scope, tenant_id = classify_seed_slug_legacy(
                    entry.slug,
                    dev_tenant_id=dev_tenant_id,
                )
                entry.scope = scope
                entry.tenant_id = tenant_id
            elif entry.journal_kind == "dev_development":
                entry.scope = "platform"
                entry.journal_kind = "platform_audit"
                entry.tenant_id = None
            elif entry.slug in TENANT_STUDIO_SEED_SLUGS:
                entry.scope = "tenant"
                entry.journal_kind = "tenant_configuration"
                entry.tenant_id = dev_tenant_id

        session.commit()
    finally:
        session.close()
