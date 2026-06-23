"""Architecture File Owner Resolver (WI-ARCH-FILE-OWNER-001).

Resolves Primary Owner and Related elements for any platform file path using the
same ownership model as Architecture Scanner v1.3.0 — no parallel logic.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Literal

from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.coverage_resolver import (
    explain_residual_primary_owner,
    resolve_file_primary_owner,
)
from app.modules.platform.architecture_navigator.ownership_policy import (
    forced_primary_owner,
    ownership_class,
    pick_primary_owner,
)
from app.modules.platform.architecture_navigator.registry_constants import (
    COMPONENTS_REGISTRY_COMPONENT_KEYS,
    CONFIGURATION_REGISTRY_COMPONENT_KEYS,
    CORE_REGISTRY_COMPONENT_KEYS,
    DATA_REGISTRY_COMPONENT_KEYS,
    INTERFACE_REGISTRY_COMPONENT_KEYS,
    MODULES_REGISTRY_COMPONENT_KEYS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    REGISTRY_COMPONENTS,
    REGISTRY_CONFIGURATION,
    REGISTRY_CORE,
    REGISTRY_DATA,
    REGISTRY_INTERFACE,
    REGISTRY_MODULES,
    REGISTRY_SERVICES,
    REGISTRY_STANDARDS,
    SERVICES_REGISTRY_COMPONENT_KEYS,
    STANDARDS_REGISTRY_COMPONENT_KEYS,
)
from app.modules.platform.architecture_navigator.scanner import (
    _component_keys_for_file,
    _scope_matches_prefix,
)

ConfidenceLevel = Literal["HIGH", "MEDIUM", "LOW"]

_BACKEND_ROOT_MARKER = "backend/app/"
_FRONTEND_ROOT_MARKER = "frontend/src/"

_BACKEND_REL_PREFIXES = (
    "core/",
    "db/",
    "shared/",
    "modules/",
    "main.py",
    "init_db.py",
)


@dataclass(frozen=True)
class FileOwnerResolution:
    file_path: str
    primary_owner: str
    registry: str
    ownership_class: str
    related_elements: list[str]
    reason: str
    confidence: ConfidenceLevel
    side: str
    rel_path: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def registry_for_component(component_key: str) -> str:
    """Map component_key to compositional registry tab key."""
    migrated = REGISTRY_COMPONENT_MIGRATION.get(component_key)
    if migrated:
        return migrated
    if component_key in CORE_REGISTRY_COMPONENT_KEYS:
        return REGISTRY_CORE
    if component_key in STANDARDS_REGISTRY_COMPONENT_KEYS:
        return REGISTRY_STANDARDS
    if component_key in SERVICES_REGISTRY_COMPONENT_KEYS:
        return REGISTRY_SERVICES
    if component_key in MODULES_REGISTRY_COMPONENT_KEYS:
        return REGISTRY_MODULES
    if component_key in COMPONENTS_REGISTRY_COMPONENT_KEYS:
        return REGISTRY_COMPONENTS
    if component_key in INTERFACE_REGISTRY_COMPONENT_KEYS:
        return REGISTRY_INTERFACE
    if component_key in DATA_REGISTRY_COMPONENT_KEYS:
        return REGISTRY_DATA
    if component_key in CONFIGURATION_REGISTRY_COMPONENT_KEYS:
        return REGISTRY_CONFIGURATION
    return REGISTRY_ARCHIVED


def normalize_platform_file_path(file_path: str) -> tuple[str, str, str]:
    """Return (canonical_path, side, rel_path) for a platform implementation file."""
    raw = file_path.strip().replace("\\", "/")
    while raw.startswith("./"):
        raw = raw[2:]

    if _BACKEND_ROOT_MARKER in raw:
        rel = raw.split(_BACKEND_ROOT_MARKER, 1)[1].lstrip("/")
        return f"{_BACKEND_ROOT_MARKER}{rel}", "backend", rel
    if _FRONTEND_ROOT_MARKER in raw:
        rel = raw.split(_FRONTEND_ROOT_MARKER, 1)[1].lstrip("/")
        return f"{_FRONTEND_ROOT_MARKER}{rel}", "frontend", rel

    if raw.startswith(_BACKEND_REL_PREFIXES) or raw.endswith(".py"):
        return f"{_BACKEND_ROOT_MARKER}{raw}", "backend", raw

    return f"{_FRONTEND_ROOT_MARKER}{raw}", "frontend", raw


def _longest_scope_prefix_for_key(component_key: str, rel_path: str, side: str) -> str | None:
    scope = COMPONENT_SCAN_SCOPES.get(component_key, {})
    best: str | None = None
    best_len = -1
    for prefix in scope.get(side) or []:
        if _scope_matches_prefix(rel_path, prefix):
            norm = prefix.strip().strip("/")
            if len(norm) > best_len:
                best_len = len(norm)
                best = norm
    return best


def _longest_scope_prefix(rel_path: str, side: str, candidates: list[str]) -> str | None:
    best: str | None = None
    best_len = -1
    for key in candidates:
        prefix = _longest_scope_prefix_for_key(key, rel_path, side)
        if prefix and len(prefix) > best_len:
            best_len = len(prefix)
            best = prefix
    return best


def _side_root_marker(side: str) -> str:
    return _BACKEND_ROOT_MARKER if side == "backend" else _FRONTEND_ROOT_MARKER


def _build_reason_and_confidence(
    *,
    rel_path: str,
    side: str,
    candidates: list[str],
    primary_owner: str,
) -> tuple[str, ConfidenceLevel]:
    scope_primary = pick_primary_owner(candidates, rel_path=rel_path, side=side)
    forced = forced_primary_owner(rel_path)
    scope_prefix = _longest_scope_prefix(rel_path, side, candidates)

    if scope_primary is not None:
        prefix = _longest_scope_prefix_for_key(scope_primary, rel_path, side) or scope_prefix
        marker = _side_root_marker(side)
        if forced is not None and forced == scope_primary:
            detail = prefix or forced
            return (
                f"Matched forced primary policy: {marker}{detail}",
                "HIGH",
            )
        detail = prefix or rel_path
        return (
            f"Matched component scope: {marker}{detail}",
            "HIGH",
        )

    _, residual_prefix, used_fallback = explain_residual_primary_owner(rel_path, side)
    marker = _side_root_marker(side)
    if used_fallback:
        return (
            "Fallback owner (no eligible component scope primary; default platform owner applied)",
            "LOW",
        )
    return (
        f"Matched residual scope: {marker}{residual_prefix or primary_owner}",
        "MEDIUM",
    )


def resolve_file_owner(file_path: str) -> FileOwnerResolution:
    """Resolve architectural ownership for an existing or hypothetical platform file."""
    canonical, side, rel_path = normalize_platform_file_path(file_path)
    candidates = _component_keys_for_file(rel_path, side)
    primary_owner = resolve_file_primary_owner(rel_path, side, candidates)
    related_elements = sorted({key for key in candidates if key != primary_owner})
    reason, confidence = _build_reason_and_confidence(
        rel_path=rel_path,
        side=side,
        candidates=candidates,
        primary_owner=primary_owner,
    )
    return FileOwnerResolution(
        file_path=canonical,
        primary_owner=primary_owner,
        registry=registry_for_component(primary_owner),
        ownership_class=ownership_class(primary_owner),
        related_elements=related_elements,
        reason=reason,
        confidence=confidence,
        side=side,
        rel_path=rel_path,
    )


def resolve_primary_owner(file_path: str) -> str:
    return resolve_file_owner(file_path).primary_owner


def resolve_related_elements(file_path: str) -> list[str]:
    return resolve_file_owner(file_path).related_elements
