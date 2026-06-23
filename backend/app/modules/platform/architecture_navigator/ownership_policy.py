"""Primary Owner policy for Architecture Scanner (WI-ARCH-OWNERSHIP-002, WI-ARCH-OWNERSHIP-003).

Implements tier-priority selection and ownership classes without changing registry rows.
"""

from __future__ import annotations

from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.registry_constants import (
    COMPONENTS_REGISTRY_COMPONENT_KEYS,
    CONFIGURATION_REGISTRY_COMPONENT_KEYS,
    CORE_REGISTRY_COMPONENT_KEYS,
    DATA_REGISTRY_COMPONENT_KEYS,
    INTERFACE_REGISTRY_COMPONENT_KEYS,
    MODULES_REGISTRY_COMPONENT_KEYS,
    SERVICES_REGISTRY_COMPONENT_KEYS,
    STANDARDS_REGISTRY_COMPONENT_KEYS,
)

OWNERSHIP_ROLE_PRIMARY = "primary"
OWNERSHIP_ROLE_RELATED = "related"

# Lower number = higher priority (YASNOPRO_CODE_OWNERSHIP_POLICY_v1 §7.1).
TIER_CORE = 1
TIER_SERVICES = 2
TIER_MODULES = 3
TIER_COMPONENTS = 4
TIER_CONFIGURATION = 5
TIER_DATA = 6
TIER_INTERFACE = 7
TIER_STANDARDS = 8

CODE_OWNER = "CODE_OWNER"
AGGREGATOR = "AGGREGATOR"
CONCEPTUAL = "CONCEPTUAL"
MISCLASSIFIED = "MISCLASSIFIED"

# Path-prefix overrides when tier order alone is insufficient (narrow, explicit).
FORCED_PRIMARY_BY_PREFIX: tuple[tuple[str, str], ...] = (
    ("modules/notifications/", "notifications-module"),
    ("modules/yasii/", "module-yasii"),
    ("modules/files/", "file-service"),
    ("modules/platform/runtime/entities/", "entity-engine"),
    ("modules/platform/runtime/catalog/", "object-types-engine"),
    ("shared/platformModal/", "platform-modal"),
    ("modules/control_plane/platform_identity/session_bridge/", "session-bridge"),
    ("modules/control_plane/platform_identity/", "platform-identity"),
)

# Elements that must never win Primary (Related only).
NEVER_PRIMARY_KEYS: frozenset[str] = frozenset(
    DATA_REGISTRY_COMPONENT_KEYS
    | INTERFACE_REGISTRY_COMPONENT_KEYS
    | {
        "constitution-norm-no-logic-duplication",
        "constitution-norm-platform-tenant-separation",
        "constitution-norm-single-sot",
        "constitution-norm-system-entity-standard",
        "decision-control-plane-not-tenant",
        "decision-entity-sot",
        "standard-ui-modal",
        "standard-data-event-journal",
        "standard-dev-journal",
        "standard-dev-prompt-preparation",
        "standard-dev-demo-readiness",
        "standard-dev-test-data-ownership",
        "standard-pub-governance-discipline",
        "standard-pub-release-package",
        "standard-pub-release-scope",
    }
)

# Standards allowed reference implementation as Primary on matched paths.
REFERENCE_IMPLEMENTATION_STANDARDS: frozenset[str] = frozenset(
    {
        "constitution-norm-environment-isolation",
        "constitution-norm-company-isolated-runtime",
        "constitution-norm-display-not-id",
        "constitution-norm-entity-identity-contract",
        "constitution-norm-dev-template-company",
        "constitution-norm-ten-categories",
        "constitution-norm-one-primary-category",
        "constitution-norm-classification-methodology",
        "decision-platform-owner-not-tenant-user",
        "standard-dev-architecture-audit",
        "standard-dev-doc-sync",
        "standard-dev-test-data-control",
        "standard-dev-cleanup-control",
        "standard-dev-data-impact",
        "standard-dev-manual-smoke",
        "standard-ui-color-zones",
        "standard-ui-three-level-model",
        "standard-ui-card-structure",
        "standard-ui-navigation-shell",
        "standard-data-identifiers",
    }
)

MISCLASSIFIED_KEYS: frozenset[str] = frozenset(
    {
        "process-engine",
        "deployment-execution",
        "notification-dispatch",
    }
)


def _build_tier_map() -> dict[str, int]:
    mapping: dict[str, int] = {}
    for key in CORE_REGISTRY_COMPONENT_KEYS:
        mapping[key] = TIER_CORE
    for key in SERVICES_REGISTRY_COMPONENT_KEYS:
        mapping[key] = TIER_SERVICES
    for key in MODULES_REGISTRY_COMPONENT_KEYS:
        mapping[key] = TIER_MODULES
    for key in COMPONENTS_REGISTRY_COMPONENT_KEYS:
        mapping[key] = TIER_COMPONENTS
    for key in CONFIGURATION_REGISTRY_COMPONENT_KEYS:
        mapping[key] = TIER_CONFIGURATION
    for key in DATA_REGISTRY_COMPONENT_KEYS:
        mapping[key] = TIER_DATA
    for key in INTERFACE_REGISTRY_COMPONENT_KEYS:
        mapping[key] = TIER_INTERFACE
    for key in STANDARDS_REGISTRY_COMPONENT_KEYS:
        mapping[key] = TIER_STANDARDS
    return mapping


COMPONENT_TIER: dict[str, int] = _build_tier_map()


def ownership_class(component_key: str) -> str:
    if component_key in MISCLASSIFIED_KEYS:
        return MISCLASSIFIED
    if component_key in NEVER_PRIMARY_KEYS:
        if component_key in DATA_REGISTRY_COMPONENT_KEYS:
            return AGGREGATOR
        if component_key in INTERFACE_REGISTRY_COMPONENT_KEYS:
            return AGGREGATOR
        return CONCEPTUAL
    if component_key in STANDARDS_REGISTRY_COMPONENT_KEYS:
        if component_key in REFERENCE_IMPLEMENTATION_STANDARDS:
            return CODE_OWNER
        return CONCEPTUAL
    if (
        component_key in CORE_REGISTRY_COMPONENT_KEYS
        or component_key in SERVICES_REGISTRY_COMPONENT_KEYS
        or component_key in MODULES_REGISTRY_COMPONENT_KEYS
        or component_key in COMPONENTS_REGISTRY_COMPONENT_KEYS
        or component_key in CONFIGURATION_REGISTRY_COMPONENT_KEYS
    ):
        return CODE_OWNER
    if component_key in DATA_REGISTRY_COMPONENT_KEYS:
        return AGGREGATOR
    if component_key in INTERFACE_REGISTRY_COMPONENT_KEYS:
        return AGGREGATOR
    return CODE_OWNER


def can_be_primary_owner(component_key: str) -> bool:
    if component_key in NEVER_PRIMARY_KEYS:
        return False
    if component_key in STANDARDS_REGISTRY_COMPONENT_KEYS:
        return component_key in REFERENCE_IMPLEMENTATION_STANDARDS
    return ownership_class(component_key) in {CODE_OWNER, MISCLASSIFIED}


def _prefix_specificity(component_key: str, rel_path: str, side: str) -> int:
    best = 0
    scope = COMPONENT_SCAN_SCOPES.get(component_key, {})
    for prefix in scope.get(side) or []:
        norm = prefix.strip().strip("/")
        if not norm:
            continue
        if norm.endswith((".py", ".js", ".jsx", ".ts", ".tsx", ".css")):
            if rel_path == norm or rel_path.endswith("/" + norm):
                best = max(best, len(norm))
        elif rel_path == norm or rel_path.startswith(norm.rstrip("/") + "/") or rel_path.startswith(norm):
            best = max(best, len(norm))
    return best


def forced_primary_owner(rel_path: str) -> str | None:
    for prefix, owner in FORCED_PRIMARY_BY_PREFIX:
        if rel_path == prefix.rstrip("/") or rel_path.startswith(prefix):
            return owner
    return None


def pick_primary_owner(
    candidates: list[str],
    *,
    rel_path: str,
    side: str,
) -> str | None:
    """Select Primary Owner for a file from scope-matched component keys."""
    if not candidates:
        return None

    forced = forced_primary_owner(rel_path)
    if forced is not None and forced in candidates:
        return forced

    eligible = [key for key in candidates if can_be_primary_owner(key)]
    if not eligible:
        return None

    scored: list[tuple[int, int, str, str]] = []
    for key in set(eligible):
        tier = COMPONENT_TIER.get(key, TIER_STANDARDS)
        specificity = _prefix_specificity(key, rel_path, side)
        scored.append((tier, -specificity, key, key))

    scored.sort()
    return scored[0][2]


def partition_file_owners(
    candidates: list[str],
    *,
    rel_path: str,
    side: str,
) -> tuple[str | None, list[str]]:
    """Return (primary_owner, related_owners) for one implementation file."""
    primary = pick_primary_owner(candidates, rel_path=rel_path, side=side)
    if primary is None:
        return None, sorted(set(candidates))
    related = sorted({key for key in candidates if key != primary})
    return primary, related
