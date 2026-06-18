"""Service layer for tenant module update previews."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_release.resolvers import resolve_release_version
from app.modules.portals.models import Portal
from app.modules.tenant_module_update_previews import crud
from app.modules.tenant_module_update_previews.models import TenantModuleUpdatePreview
from app.modules.tenant_module_update_previews.schemas import (
    TenantModuleUpdatePreviewDetailOut,
    TenantModuleUpdatePreviewOut,
)


def _resolve_module_title(db: Session, module_key: str) -> str | None:
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    return module.title if module is not None else None


def _resolve_tenant_name(db: Session, tenant_id: int) -> str | None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    return portal.name if portal is not None else None


def _resolve_release_version(db: Session, release_id: int | None) -> str | None:
    return resolve_release_version(db, release_id)


def _extract_change_items(impact_analysis: dict[str, Any] | None) -> list[str]:
    if not isinstance(impact_analysis, dict):
        return []

    change_items = impact_analysis.get("change_items")
    if isinstance(change_items, list):
        return [str(item) for item in change_items if str(item).strip()]

    return []


def serialize_preview(
    db: Session,
    preview: TenantModuleUpdatePreview,
    *,
    include_details: bool = False,
) -> TenantModuleUpdatePreviewOut | TenantModuleUpdatePreviewDetailOut:
    payload = {
        "id": preview.id,
        "tenant_id": preview.tenant_id,
        "tenant_name": _resolve_tenant_name(db, preview.tenant_id),
        "offer_id": preview.offer_id,
        "module_key": preview.module_key,
        "module_title": _resolve_module_title(db, preview.module_key),
        "from_version": preview.from_version,
        "to_version": preview.to_version,
        "release_id": preview.release_id,
        "release_version": _resolve_release_version(db, preview.release_id),
        "preview_status": preview.preview_status,
        "summary": preview.summary,
        "risk_level": preview.risk_level,
        "generated_at": preview.generated_at,
    }

    if not include_details:
        return TenantModuleUpdatePreviewOut(**payload)

    impact_analysis = preview.impact_analysis if isinstance(preview.impact_analysis, dict) else {}

    return TenantModuleUpdatePreviewDetailOut(
        **payload,
        impact_analysis=impact_analysis,
        affected_components=list(preview.affected_components or []),
        affected_routes=list(preview.affected_routes or []),
        affected_tables=list(preview.affected_tables or []),
        affected_permissions=list(preview.affected_permissions or []),
        affected_settings=list(preview.affected_settings or []),
        affected_views=list(preview.affected_views or []),
        affected_rules=list(preview.affected_rules or []),
        affected_templates=list(preview.affected_templates or []),
        affected_dependencies=list(preview.affected_dependencies or []),
        change_items=_extract_change_items(impact_analysis),
        configuration_diff=(
            impact_analysis.get("configuration_diff")
            if isinstance(impact_analysis.get("configuration_diff"), dict)
            else {}
        ),
        publication_metadata=(
            impact_analysis.get("publication_metadata")
            if isinstance(impact_analysis.get("publication_metadata"), dict)
            else {}
        ),
    )


def list_tenant_previews(db: Session, tenant_id: int) -> list[TenantModuleUpdatePreviewOut]:
    return [serialize_preview(db, preview) for preview in crud.list_previews_for_tenant(db, tenant_id)]


def get_tenant_preview(
    db: Session,
    *,
    tenant_id: int,
    preview_id: int,
) -> TenantModuleUpdatePreviewDetailOut | None:
    preview = crud.get_preview(db, tenant_id=tenant_id, preview_id=preview_id)
    if preview is None:
        return None
    return serialize_preview(db, preview, include_details=True)


def get_preview_for_offer(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
) -> TenantModuleUpdatePreviewDetailOut | None:
    preview = crud.get_current_preview_for_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if preview is None:
        return None
    return serialize_preview(db, preview, include_details=True)


def list_all_previews(db: Session) -> list[TenantModuleUpdatePreviewOut]:
    return [serialize_preview(db, preview) for preview in crud.list_all_previews(db)]
