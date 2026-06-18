"""Governance block helpers for platform release packages (migration Step 1)."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any, Protocol

from app.modules.platform_deployment_registry.constants import PlatformDeploymentStatus
from app.modules.platform_release.constants import PlatformReleaseStatus
from app.modules.platform_release_package_registry.constants import PlatformReleasePackageStatus

GOVERNANCE_MANIFEST_KEY = "governance"

GOVERNANCE_REVIEW_STATUS_VALUES: frozenset[str] = frozenset({
    PlatformReleaseStatus.DRAFT.value,
    PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value,
    PlatformReleaseStatus.IN_PLATFORM_REVIEW.value,
    PlatformReleaseStatus.CHANGES_REQUESTED.value,
    PlatformReleaseStatus.APPROVED_BY_PLATFORM.value,
    PlatformReleaseStatus.PUBLISHED_TO_TEMPLATE.value,
    PlatformReleaseStatus.OFFERED_TO_TENANTS.value,
})

SUBMIT_FOR_REVIEW_SOURCE_GOVERNANCE_STATUSES: frozenset[str] = frozenset({
    PlatformReleaseStatus.DRAFT.value,
    PlatformReleaseStatus.CHANGES_REQUESTED.value,
})

GOVERNANCE_FIELD_NAMES: tuple[str, ...] = (
    "review_status",
    "submitted_at",
    "submitted_by",
    "review_started_at",
    "review_started_by",
    "review_comment",
    "approved_at",
    "approved_by",
    "changes_requested_at",
    "changes_requested_by",
    "offered_at",
    "offered_by",
    "legacy_release_bridge_id",
)


class _PackageManifestCarrier(Protocol):
    package_manifest_json: dict[str, Any] | None
    status: str


def default_governance() -> dict[str, Any]:
    """Canonical empty governance block for package_manifest_json."""
    return {
        "review_status": PlatformReleaseStatus.DRAFT.value,
        "submitted_at": None,
        "submitted_by": None,
        "review_started_at": None,
        "review_started_by": None,
        "review_comment": None,
        "approved_at": None,
        "approved_by": None,
        "changes_requested_at": None,
        "changes_requested_by": None,
        "offered_at": None,
        "offered_by": None,
        "legacy_release_bridge_id": None,
    }


def _coerce_manifest(package: _PackageManifestCarrier) -> dict[str, Any]:
    manifest = package.package_manifest_json
    if isinstance(manifest, dict):
        return manifest
    return {}


def get_governance(package: _PackageManifestCarrier) -> dict[str, Any]:
    """Read governance block; missing keys are filled with defaults."""
    manifest = _coerce_manifest(package)
    raw = manifest.get(GOVERNANCE_MANIFEST_KEY)
    if not isinstance(raw, dict):
        return default_governance()

    merged = default_governance()
    for key in GOVERNANCE_FIELD_NAMES:
        if key in raw:
            merged[key] = raw[key]
    return merged


def set_governance(package: _PackageManifestCarrier, governance_data: dict[str, Any]) -> dict[str, Any]:
    """Persist governance block into package_manifest_json (in-memory on package)."""
    manifest = deepcopy(_coerce_manifest(package))
    current = get_governance(package)
    for key in GOVERNANCE_FIELD_NAMES:
        if key in governance_data:
            current[key] = governance_data[key]
    manifest[GOVERNANCE_MANIFEST_KEY] = current
    package.package_manifest_json = manifest
    return current


def get_review_status(package: _PackageManifestCarrier) -> str:
    governance = get_governance(package)
    status = str(governance.get("review_status") or "").strip().lower()
    if status in GOVERNANCE_REVIEW_STATUS_VALUES:
        return status
    return PlatformReleaseStatus.DRAFT.value


def set_review_status(package: _PackageManifestCarrier, status: str) -> str:
    normalized = str(status or "").strip().lower()
    if normalized not in GOVERNANCE_REVIEW_STATUS_VALUES:
        raise ValueError(f"Unsupported governance review_status: {status}")
    set_governance(package, {"review_status": normalized})
    return normalized


def compute_platform_release_ui_status(
    package: _PackageManifestCarrier,
    *,
    latest_template_deployment: Any | None = None,
    offers_exist: bool = False,
) -> str:
    """
    Map package lifecycle + governance + deployment/offers to legacy UI status strings.

    Priority:
    1. offers_exist -> offered_to_tenants
    2. package published + template deployment succeeded -> published_to_template
    3. governance.review_status when set
    4. draft
    """
    if offers_exist:
        return PlatformReleaseStatus.OFFERED_TO_TENANTS.value

    package_status = str(getattr(package, "status", "") or "").strip().lower()
    deployment_status = str(getattr(latest_template_deployment, "status", "") or "").strip().lower()
    if (
        package_status == PlatformReleasePackageStatus.PUBLISHED.value
        and deployment_status == PlatformDeploymentStatus.SUCCEEDED.value
    ):
        return PlatformReleaseStatus.PUBLISHED_TO_TEMPLATE.value

    governance = get_governance(package)
    review_status = str(governance.get("review_status") or "").strip().lower()
    if review_status in GOVERNANCE_REVIEW_STATUS_VALUES:
        return review_status

    return PlatformReleaseStatus.DRAFT.value


def parse_manifest_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    normalized = text.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None
