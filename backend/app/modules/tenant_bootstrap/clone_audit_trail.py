"""Audit trail for tenant structure clone write-policy bypass."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.constants import PlatformEventJournalSource

if TYPE_CHECKING:
    from app.modules.tenant_bootstrap.clone_tenant_structure import CloneTenantStructureResult

CLONE_BYPASS_EVENT_CODE = "tenant_structure_clone_bypass"
CLONE_BYPASS_EVENT_CATEGORY = "publication_guard"


def record_tenant_structure_clone_bypass(
    db: Session,
    *,
    result: CloneTenantStructureResult,
    reason: str,
    actor_user_id: int | None = None,
    source: str = PlatformEventJournalSource.MANUAL.value,
    commit: bool = False,
) -> None:
    """Persist clone bypass metadata to platform event journal."""
    from app.modules.platform_event_journal.audit_service import record_platform_event

    metadata = {
        "reason": reason,
        "bypass_write_policy": True,
        "source_tenant_id": result.source_tenant_id,
        "target_tenant_id": result.target_tenant_id,
        "catalog_version": result.catalog_version,
        "objects_count": {
            "pages": result.pages_cloned,
            "navigation_items": result.navigation_items_cloned,
            "object_types": result.object_types_cloned,
            "workspaces": result.workspaces_cloned,
            "designer_system_menu_settings": result.designer_system_menu_settings_cloned,
            "tenant_runtime_menu_settings": result.tenant_runtime_menu_settings_cloned,
        },
        "recorded_at": datetime.utcnow().isoformat(),
    }
    record_platform_event(
        db,
        event_code=CLONE_BYPASS_EVENT_CODE,
        event_category=CLONE_BYPASS_EVENT_CATEGORY,
        title="Tenant structure clone (write-policy bypass)",
        description=(
            f"Structure cloned from tenant {result.source_tenant_id} "
            f"to tenant {result.target_tenant_id} with explicit publication-guard bypass."
        ),
        actor_user_id=actor_user_id,
        target_type="portal",
        target_id=result.target_tenant_id,
        company_id=result.target_tenant_id,
        metadata=metadata,
        source=source,
        commit=commit,
    )
