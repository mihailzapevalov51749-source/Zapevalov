"""Generate tenant module update previews from offers and manifests."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_release.resolvers import resolve_release_version
from app.modules.tenant_module_update_offers.generator import (
    _aggregate_change_summary,
    _split_change_summary,
    find_upgrade_release_modules,
)
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews import crud
from app.modules.tenant_module_update_previews.constants import (
    DEFAULT_PREVIEW_RISK_LEVEL,
    GENERATOR_SOURCE,
    TenantModuleUpdatePreviewStatus,
)
from app.modules.tenant_module_configuration_diffs.generator import (
    enrich_preview_payload_with_configuration_diff,
)
from app.modules.tenant_module_update_previews.models import TenantModuleUpdatePreview


def _normalize_string_list(values: list[Any] | None) -> list[str]:
    items: list[str] = []
    seen: set[str] = set()
    for value in values or []:
        normalized = str(value or "").strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        items.append(normalized)
    return items


def _extract_component_names(frontend_components: list[Any] | None) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()

    for raw_path in frontend_components or []:
        path = str(raw_path or "").strip()
        if not path or path.endswith("/*"):
            continue

        basename = path.rsplit("/", 1)[-1].strip()
        if not basename or basename in seen:
            continue

        seen.add(basename)
        names.append(basename)

    return names


def _extract_routes_from_manifest(manifest: Any) -> list[str]:
    routes: list[str] = []
    seen: set[str] = set()

    for entry_point in manifest.entry_points or []:
        if not isinstance(entry_point, dict):
            continue
        system_key = str(entry_point.get("system_key") or "").strip()
        if system_key and system_key not in seen:
            seen.add(system_key)
            routes.append(system_key)

    for raw_route in manifest.frontend_routes or []:
        route = str(raw_route or "").strip()
        if route and route not in seen:
            seen.add(route)
            routes.append(route)

    return routes


def _resolve_module_title(db: Session, module_key: str) -> str:
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    if module is not None and str(module.title or "").strip():
        return str(module.title).strip()
    return module_key


def _resolve_release_version(db: Session, release_id: int | None) -> str | None:
    return resolve_release_version(db, release_id)


def _build_release_steps(
    db: Session,
    *,
    module_key: str,
    from_version: str,
    to_version: str,
) -> list[dict[str, Any]]:
    upgrade_path = find_upgrade_release_modules(
        db,
        module_key=module_key,
        from_version=from_version,
        to_version=to_version,
    )

    steps: list[dict[str, Any]] = []
    for row in upgrade_path:
        steps.append(
            {
                "from_version": row.from_version,
                "to_version": row.to_version,
                "release_id": row.release_id,
                "release_version": _resolve_release_version(db, row.release_id),
                "change_summary": row.change_summary,
                "change_items": _split_change_summary(row.change_summary),
            }
        )
    return steps


def build_preview_payload_from_offer(
    db: Session,
    offer: TenantModuleUpdateOffer,
) -> dict[str, Any]:
    manifest = get_active_manifest_for_module(db, offer.module_key)
    module_title = _resolve_module_title(db, offer.module_key)

    from_version = str(offer.from_version or "1.0.0")
    to_version = str(offer.to_version or from_version)

    summary = f"Обновление {module_title} с версии {from_version} до {to_version}"

    release_steps = _build_release_steps(
        db,
        module_key=offer.module_key,
        from_version=from_version,
        to_version=to_version,
    )

    aggregated_summary = _aggregate_change_summary(
        [step.get("change_summary") for step in release_steps]
    )
    if not aggregated_summary:
        aggregated_summary = offer.change_summary

    change_items = _split_change_summary(aggregated_summary)

    impact_analysis: dict[str, Any] = {
        "generator": GENERATOR_SOURCE,
        "change_items": change_items,
        "change_summary": aggregated_summary,
        "release_steps": release_steps,
    }

    if getattr(offer, "publication_id", None):
        from app.modules.platform_module_publications.crud import get_publication

        publication = get_publication(db, int(offer.publication_id))
        if publication is not None:
            approved_by_name = None
            if publication.approved_by is not None:
                from app.modules.users.models import User

                approver = db.query(User).filter(User.id == publication.approved_by).one_or_none()
                if approver is not None:
                    approved_by_name = approver.full_name or approver.email
            impact_analysis["publication_metadata"] = {
                "source": "Published from Platform Template",
                "publication_date": publication.published_at.isoformat() if publication.published_at else None,
                "publication_id": publication.id,
                "approved_by": publication.approved_by,
                "approved_by_name": approved_by_name,
                "release_summary": publication.release_summary,
            }

    affected_components: list[str] = []
    affected_routes: list[str] = []
    affected_tables: list[str] = []
    affected_dependencies: list[str] = []

    if manifest is not None:
        affected_components = _extract_component_names(manifest.frontend_components)
        affected_routes = _extract_routes_from_manifest(manifest)
        affected_tables = _normalize_string_list(manifest.db_tables)
        affected_dependencies = _normalize_string_list(manifest.dependencies)

    payload = {
        "tenant_id": offer.tenant_id,
        "offer_id": offer.id,
        "module_key": offer.module_key,
        "from_version": from_version,
        "to_version": to_version,
        "release_id": offer.release_id,
        "preview_status": TenantModuleUpdatePreviewStatus.GENERATED,
        "summary": summary,
        "impact_analysis": impact_analysis,
        "affected_components": affected_components,
        "affected_routes": affected_routes,
        "affected_tables": affected_tables,
        "affected_permissions": [],
        "affected_settings": [],
        "affected_views": [],
        "affected_rules": [],
        "affected_templates": [],
        "affected_dependencies": affected_dependencies,
        "risk_level": DEFAULT_PREVIEW_RISK_LEVEL,
    }

    return enrich_preview_payload_with_configuration_diff(db, offer, payload)


def generate_preview_for_offer(
    db: Session,
    offer: TenantModuleUpdateOffer,
    *,
    commit: bool = False,
) -> dict[str, int | TenantModuleUpdatePreview | None]:
    now = datetime.utcnow()
    payload = build_preview_payload_from_offer(db, offer)

    superseded = crud.mark_generated_previews_superseded_for_offer(db, offer_id=offer.id)

    preview = TenantModuleUpdatePreview(
        tenant_id=payload["tenant_id"],
        offer_id=payload["offer_id"],
        module_key=payload["module_key"],
        from_version=payload["from_version"],
        to_version=payload["to_version"],
        release_id=payload["release_id"],
        preview_status=payload["preview_status"],
        summary=payload["summary"],
        impact_analysis=payload["impact_analysis"],
        affected_components=payload["affected_components"],
        affected_routes=payload["affected_routes"],
        affected_tables=payload["affected_tables"],
        affected_permissions=payload["affected_permissions"],
        affected_settings=payload["affected_settings"],
        affected_views=payload["affected_views"],
        affected_rules=payload["affected_rules"],
        affected_templates=payload["affected_templates"],
        affected_dependencies=payload["affected_dependencies"],
        risk_level=payload["risk_level"],
        generated_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(preview)
    db.flush()

    if commit:
        db.commit()

    return {"created": 1, "superseded": superseded, "preview": preview}


def mark_previews_outdated_for_withdrawn_offer(
    db: Session,
    *,
    offer_id: int,
    commit: bool = False,
) -> int:
    outdated = crud.mark_previews_outdated_for_offer(db, offer_id=offer_id)
    if commit:
        db.commit()
    return outdated


def generate_previews_for_tenant(
    db: Session,
    tenant_id: int,
    *,
    commit: bool = False,
) -> dict[str, int]:
    from app.modules.tenant_module_update_offers import crud as offers_crud

    totals = {"created": 0, "superseded": 0, "offers": 0}

    for offer in offers_crud.list_offers_for_tenant(db, tenant_id):
        if offer.status != "available":
            continue
        totals["offers"] += 1
        result = generate_preview_for_offer(db, offer, commit=False)
        totals["created"] += int(result["created"])
        totals["superseded"] += int(result["superseded"])

    db.flush()
    if commit:
        db.commit()

    return totals


def generate_previews_for_all_tenants(
    db: Session,
    *,
    tenant_ids: list[int] | None = None,
    commit: bool = True,
) -> dict[str, int]:
    from app.modules.portals.models import Portal

    query = db.query(Portal.id)
    if tenant_ids:
        query = query.filter(Portal.id.in_(tenant_ids))

    totals = {"created": 0, "superseded": 0, "offers": 0, "tenants": 0}

    for (portal_id,) in query.order_by(Portal.id.asc()).all():
        result = generate_previews_for_tenant(db, portal_id, commit=False)
        totals["created"] += result["created"]
        totals["superseded"] += result["superseded"]
        totals["offers"] += result["offers"]
        totals["tenants"] += 1

    db.flush()
    if commit:
        db.commit()

    return totals


def regenerate_preview_after_offer_change(
    db: Session,
    offer: TenantModuleUpdateOffer | None,
    *,
    withdrawn_offer_ids: list[int] | None = None,
    commit: bool = False,
) -> dict[str, int]:
    totals = {"created": 0, "superseded": 0, "outdated": 0}

    for offer_id in withdrawn_offer_ids or []:
        totals["outdated"] += mark_previews_outdated_for_withdrawn_offer(db, offer_id=offer_id)

    if offer is not None:
        result = generate_preview_for_offer(db, offer, commit=False)
        totals["created"] += int(result["created"])
        totals["superseded"] += int(result["superseded"])

    if commit:
        db.commit()

    return totals
