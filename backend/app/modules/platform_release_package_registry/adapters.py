"""Adapters from platform release package registry to legacy release DTOs (migration Step 1)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.modules.platform_deployment_registry.constants import PlatformDeploymentStatus
from app.modules.platform_release.schemas import (
    PlatformReleaseListItem,
    PlatformReleaseOut,
    ReleaseChangeOut,
)
from app.modules.platform_release_package_registry.governance import (
    compute_platform_release_ui_status,
    get_governance,
    parse_manifest_datetime,
)
from app.modules.platform_release_scope.service import serialize_release_scope


def _coerce_manifest_dict(package: Any) -> dict[str, Any]:
    manifest = getattr(package, "package_manifest_json", None)
    if isinstance(manifest, dict):
        return manifest
    return {}


def _resolve_title(package: Any, manifest: dict[str, Any]) -> str:
    title = manifest.get("title")
    if title is not None and str(title).strip():
        return str(title).strip()
    platform_version = str(getattr(package, "platform_version", "") or "").strip()
    if platform_version:
        return f"Релиз {platform_version}"
    package_key = str(getattr(package, "package_key", "") or "").strip()
    if package_key:
        return package_key
    return "Релиз платформы"


def _resolve_source_tenant_id(build: Any | None) -> int:
    if build is None:
        return 0
    manifest = getattr(build, "build_manifest_json", None)
    if not isinstance(manifest, dict):
        return 0
    source_tenant_id = manifest.get("source_tenant_id")
    if source_tenant_id is None:
        return 0
    try:
        return int(source_tenant_id)
    except (TypeError, ValueError):
        return 0


def _resolve_published_at(
    package: Any,
    latest_template_deployment: Any | None,
) -> datetime | None:
    if latest_template_deployment is not None:
        deployment_status = str(getattr(latest_template_deployment, "status", "") or "").strip().lower()
        if deployment_status == PlatformDeploymentStatus.SUCCEEDED.value:
            finished_at = getattr(latest_template_deployment, "finished_at", None)
            if isinstance(finished_at, datetime):
                return finished_at
    published_at = getattr(package, "published_at", None)
    if isinstance(published_at, datetime):
        return published_at
    return None


def _resolve_published_by(
    governance: dict[str, Any],
    latest_template_deployment: Any | None,
) -> int | None:
    if latest_template_deployment is not None:
        created_by = getattr(latest_template_deployment, "created_by", None)
        if created_by is not None:
            try:
                return int(created_by)
            except (TypeError, ValueError):
                pass
    offered_by = governance.get("offered_by")
    if offered_by is not None:
        try:
            return int(offered_by)
        except (TypeError, ValueError):
            return None
    return None


def _manifest_changes_to_release_changes(
    package: Any,
    manifest: dict[str, Any],
) -> list[ReleaseChangeOut]:
    raw_changes = manifest.get("changes")
    if not isinstance(raw_changes, list):
        return []

    package_id = int(getattr(package, "id", 0) or 0)
    package_created_at = getattr(package, "created_at", None)
    default_created_at = package_created_at if isinstance(package_created_at, datetime) else datetime.utcnow()

    result: list[ReleaseChangeOut] = []
    for index, item in enumerate(raw_changes):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        change_id = item.get("id")
        try:
            normalized_id = int(change_id) if change_id is not None else index + 1
        except (TypeError, ValueError):
            normalized_id = index + 1

        created_at = parse_manifest_datetime(item.get("created_at")) or default_created_at
        result.append(
            ReleaseChangeOut(
                id=normalized_id,
                release_id=package_id,
                change_type=str(item.get("change_type") or "other").strip().lower(),
                entity_type=item.get("entity_type"),
                entity_id=item.get("entity_id"),
                system_key=item.get("system_key"),
                title=title,
                description=item.get("description"),
                risk_level=str(item.get("risk_level") or "low").strip().lower(),
                created_at=created_at,
            )
        )
    return result


def package_to_platform_release_out(
    package: Any,
    *,
    build: Any | None = None,
    latest_template_deployment: Any | None = None,
    offers_exist: bool = False,
) -> PlatformReleaseOut:
    """
    Build PlatformReleaseOut-compatible DTO from package registry sources.

    Does not touch legacy platform_releases table.
    """
    manifest = _coerce_manifest_dict(package)
    governance = get_governance(package)
    changes = _manifest_changes_to_release_changes(package, manifest)

    target_template_tenant_id: int | None = None
    if latest_template_deployment is not None:
        raw_target = getattr(latest_template_deployment, "target_tenant_id", None)
        if raw_target is not None:
            try:
                target_template_tenant_id = int(raw_target)
            except (TypeError, ValueError):
                target_template_tenant_id = None

    description = getattr(package, "release_notes", None)
    if description is not None:
        description = str(description).strip() or None

    return PlatformReleaseOut(
        id=int(getattr(package, "id")),
        version=str(getattr(package, "platform_version")),
        title=_resolve_title(package, manifest),
        description=description,
        status=compute_platform_release_ui_status(
            package,
            latest_template_deployment=latest_template_deployment,
            offers_exist=offers_exist,
        ),
        source_tenant_id=_resolve_source_tenant_id(build),
        target_template_tenant_id=target_template_tenant_id,
        created_by=getattr(package, "created_by", None),
        created_at=getattr(package, "created_at"),
        submitted_at=parse_manifest_datetime(governance.get("submitted_at")),
        submitted_by=governance.get("submitted_by"),
        review_started_at=parse_manifest_datetime(governance.get("review_started_at")),
        review_started_by=governance.get("review_started_by"),
        review_comment=governance.get("review_comment"),
        approved_at=parse_manifest_datetime(governance.get("approved_at")),
        approved_by=governance.get("approved_by"),
        changes_requested_at=parse_manifest_datetime(governance.get("changes_requested_at")),
        changes_requested_by=governance.get("changes_requested_by"),
        published_at=_resolve_published_at(package, latest_template_deployment),
        published_by=_resolve_published_by(governance, latest_template_deployment),
        changes=changes,
        release_scope=serialize_release_scope(package),
        included_architectural_elements=_manifest_architectural_elements(manifest),
    )


def _manifest_architectural_elements(manifest: dict[str, Any]) -> list[str]:
    raw = manifest.get("included_architectural_elements")
    if not isinstance(raw, list):
        return []
    return sorted({str(item).strip() for item in raw if str(item).strip()})


def package_to_platform_release_list_item(
    package: Any,
    *,
    build: Any | None = None,
    latest_template_deployment: Any | None = None,
    offers_exist: bool = False,
) -> PlatformReleaseListItem:
    """Build PlatformReleaseListItem-compatible DTO from package registry sources."""
    release_out = package_to_platform_release_out(
        package,
        build=build,
        latest_template_deployment=latest_template_deployment,
        offers_exist=offers_exist,
    )
    return PlatformReleaseListItem(
        id=release_out.id,
        version=release_out.version,
        title=release_out.title,
        status=release_out.status,
        source_tenant_id=release_out.source_tenant_id,
        target_template_tenant_id=release_out.target_template_tenant_id,
        created_at=release_out.created_at,
        submitted_at=release_out.submitted_at,
        review_comment=release_out.review_comment,
        published_at=release_out.published_at,
        changes_count=len(release_out.changes),
    )
