"""Release Scope Manifest helpers — embedded in platform_release_packages.package_manifest_json."""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Protocol

from app.modules.platform_release_scope.constants import (
    EDITABLE_SCOPE_STATUSES,
    RELEASE_SCOPE_MANIFEST_KEY,
    RELEASE_SCOPE_SCHEMA_VERSION,
    SCOPE_PROOF_VERSION,
    ReleaseScopeStatus,
)


class _PackageManifestCarrier(Protocol):
    package_manifest_json: dict[str, Any] | None
    status: str


def default_release_scope() -> dict[str, Any]:
    """Canonical empty release scope block."""
    return {
        "scope_version": RELEASE_SCOPE_SCHEMA_VERSION,
        "scope_status": ReleaseScopeStatus.DRAFT.value,
        "included_work_items": [],
        "included_modules": [],
        "included_changes": [],
        "included_runtime_changes": [],
        "included_migrations": [],
        "included_artifacts": [],
        "excluded_changes": [],
        "known_limitations": [],
        "scope_proof": None,
        "defined_at": None,
        "defined_by": None,
        "reviewed_at": None,
        "reviewed_by": None,
        "approved_at": None,
        "approved_by": None,
        "published_at": None,
        "archived_at": None,
    }


def _coerce_manifest(package: _PackageManifestCarrier) -> dict[str, Any]:
    manifest = package.package_manifest_json
    if isinstance(manifest, dict):
        return manifest
    return {}


def has_release_scope(package: _PackageManifestCarrier) -> bool:
    manifest = _coerce_manifest(package)
    raw = manifest.get(RELEASE_SCOPE_MANIFEST_KEY)
    return isinstance(raw, dict) and bool(raw)


def get_release_scope(package: _PackageManifestCarrier) -> dict[str, Any]:
    """Read release scope; missing keys are filled with defaults."""
    manifest = _coerce_manifest(package)
    raw = manifest.get(RELEASE_SCOPE_MANIFEST_KEY)
    if not isinstance(raw, dict):
        return default_release_scope()

    merged = default_release_scope()
    for key in merged:
        if key in raw:
            merged[key] = raw[key]
    return merged


def get_scope_status(package: _PackageManifestCarrier) -> str:
    scope = get_release_scope(package)
    status = str(scope.get("scope_status") or "").strip().lower()
    try:
        ReleaseScopeStatus(status)
        return status
    except ValueError:
        return ReleaseScopeStatus.DRAFT.value


def set_release_scope(
    package: _PackageManifestCarrier,
    scope_data: dict[str, Any],
) -> dict[str, Any]:
    """Persist release scope into package_manifest_json (in-memory on package)."""
    manifest = deepcopy(_coerce_manifest(package))
    current = get_release_scope(package)
    for key in current:
        if key in scope_data:
            current[key] = scope_data[key]
    manifest[RELEASE_SCOPE_MANIFEST_KEY] = current
    package.package_manifest_json = manifest
    return current


def _normalize_list_items(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []
    result: list[dict[str, Any]] = []
    for item in items:
        if isinstance(item, dict):
            result.append(dict(item))
    return result


def build_included_changes_from_release_changes(
    changes: list[Any],
) -> list[dict[str, Any]]:
    """Map legacy release `changes[]` payload into scope included_changes entries."""
    result: list[dict[str, Any]] = []
    for index, change in enumerate(changes):
        if isinstance(change, dict):
            title = str(change.get("title") or "").strip()
            if not title:
                continue
            result.append(
                {
                    "change_type": str(change.get("change_type") or "other").strip().lower(),
                    "entity_type": change.get("entity_type"),
                    "entity_id": change.get("entity_id"),
                    "system_key": change.get("system_key"),
                    "title": title,
                    "description": change.get("description"),
                    "risk_level": str(change.get("risk_level") or "low").strip().lower(),
                    "source": "release_changes",
                    "ordinal": index + 1,
                }
            )
            continue
        title = str(getattr(change, "title", "") or "").strip()
        if not title:
            continue
        result.append(
            {
                "change_type": str(getattr(change, "change_type", "other") or "other").strip().lower(),
                "entity_type": getattr(change, "entity_type", None),
                "entity_id": getattr(change, "entity_id", None),
                "system_key": getattr(change, "system_key", None),
                "title": title,
                "description": getattr(change, "description", None),
                "risk_level": str(getattr(change, "risk_level", "low") or "low").strip().lower(),
                "source": "release_changes",
                "ordinal": index + 1,
            }
        )
    return result


def build_included_modules_from_bom(module_bom_json: dict[str, Any]) -> list[dict[str, Any]]:
    modules_raw = module_bom_json.get("modules")
    if not isinstance(modules_raw, list):
        return []
    result: list[dict[str, Any]] = []
    for item in modules_raw:
        if not isinstance(item, dict):
            continue
        module_key = str(item.get("module_key") or "").strip()
        if not module_key:
            continue
        result.append(
            {
                "module_key": module_key,
                "module_title": item.get("module_title"),
                "from_version": str(item.get("from_version") or "n/a"),
                "to_version": str(item.get("to_version") or "n/a"),
                "change_summary": item.get("change_summary"),
            }
        )
    return result


def scope_has_defined_content(scope: dict[str, Any]) -> bool:
    """True when at least one included* list is non-empty."""
    for field in (
        "included_work_items",
        "included_modules",
        "included_changes",
        "included_runtime_changes",
        "included_migrations",
        "included_artifacts",
    ):
        items = _normalize_list_items(scope.get(field))
        if items:
            return True
    return False


def build_scope_digest_input(scope: dict[str, Any]) -> dict[str, Any]:
    """
    Canonical immutable input for scope_digest.

    Excludes audit timestamps, scope_proof, and scope_status transitions metadata.
    """
    return {
        "scope_version": str(scope.get("scope_version") or RELEASE_SCOPE_SCHEMA_VERSION),
        "included_work_items": _normalize_list_items(scope.get("included_work_items")),
        "included_modules": _normalize_list_items(scope.get("included_modules")),
        "included_changes": _normalize_list_items(scope.get("included_changes")),
        "included_runtime_changes": _normalize_list_items(scope.get("included_runtime_changes")),
        "included_migrations": _normalize_list_items(scope.get("included_migrations")),
        "included_artifacts": _normalize_list_items(scope.get("included_artifacts")),
        "excluded_changes": _normalize_list_items(scope.get("excluded_changes")),
        "known_limitations": _normalize_list_items(scope.get("known_limitations")),
    }


def compute_scope_digest(scope: dict[str, Any]) -> str:
    payload = build_scope_digest_input(scope)
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def build_scope_proof(scope: dict[str, Any]) -> dict[str, Any]:
    """Build scope_proof block answering what is in / out of the release."""
    digest_input = build_scope_digest_input(scope)
    included_count = {
        "work_items": len(digest_input["included_work_items"]),
        "modules": len(digest_input["included_modules"]),
        "changes": len(digest_input["included_changes"]),
        "runtime_changes": len(digest_input["included_runtime_changes"]),
        "migrations": len(digest_input["included_migrations"]),
        "artifacts": len(digest_input["included_artifacts"]),
    }
    excluded_count = {
        "changes": len(digest_input["excluded_changes"]),
        "limitations": len(digest_input["known_limitations"]),
    }
    scope_digest = compute_scope_digest(scope)
    return {
        "proof_version": SCOPE_PROOF_VERSION,
        "scope_digest": scope_digest,
        "computed_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
            "+00:00", "Z"
        ),
        "included_count": included_count,
        "excluded_count": excluded_count,
        "summary": (
            f"included={sum(included_count.values())} items; "
            f"excluded={excluded_count['changes']} changes; "
            f"limitations={excluded_count['limitations']}"
        ),
    }


def attach_release_scope_to_manifest(
    manifest: dict[str, Any],
    *,
    included_changes: list[dict[str, Any]] | None = None,
    included_modules: list[dict[str, Any]] | None = None,
    included_work_items: list[dict[str, Any]] | None = None,
    excluded_changes: list[dict[str, Any]] | None = None,
    actor_user_id: int | None = None,
) -> dict[str, Any]:
    """Initialize or refresh release_scope on a new package manifest dict."""
    enriched = dict(manifest or {})
    scope = default_release_scope()

    if included_changes is not None:
        scope["included_changes"] = list(included_changes)
    if included_modules is not None:
        scope["included_modules"] = list(included_modules)
    if included_work_items is not None:
        scope["included_work_items"] = list(included_work_items)
    if excluded_changes is not None:
        scope["excluded_changes"] = list(excluded_changes)

    if scope_has_defined_content(scope):
        scope["scope_status"] = ReleaseScopeStatus.SCOPE_DEFINED.value
        scope["defined_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
            "+00:00", "Z"
        )
        if actor_user_id is not None:
            scope["defined_by"] = int(actor_user_id)

    scope["scope_proof"] = build_scope_proof(scope)
    enriched[RELEASE_SCOPE_MANIFEST_KEY] = scope
    return enriched


def is_scope_editable(package: _PackageManifestCarrier) -> bool:
    package_status = str(getattr(package, "status", "") or "").strip().lower()
    if package_status != "draft":
        return False
    return get_scope_status(package) in EDITABLE_SCOPE_STATUSES
