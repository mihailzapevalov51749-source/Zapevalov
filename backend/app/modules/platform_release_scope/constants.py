"""Constants for Release Scope Manifest (WI-REL-001, ADR-REL-001)."""

from __future__ import annotations

from enum import Enum

RELEASE_SCOPE_MANIFEST_KEY = "release_scope"

RELEASE_SCOPE_SCHEMA_VERSION = "1.0"

SCOPE_PROOF_VERSION = "1.0"


class ReleaseScopeStatus(str, Enum):
    """Lifecycle of release scope within a package (independent of package.status)."""

    DRAFT = "draft"
    SCOPE_DEFINED = "scope_defined"
    SCOPE_REVIEWED = "scope_reviewed"
    SCOPE_APPROVED = "scope_approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


EDITABLE_SCOPE_STATUSES: frozenset[str] = frozenset(
    {
        ReleaseScopeStatus.DRAFT.value,
        ReleaseScopeStatus.SCOPE_DEFINED.value,
    }
)

TERMINAL_SCOPE_STATUSES: frozenset[str] = frozenset(
    {
        ReleaseScopeStatus.PUBLISHED.value,
        ReleaseScopeStatus.ARCHIVED.value,
    }
)

SCOPE_STATUS_FIELD_NAMES: tuple[str, ...] = (
    "scope_version",
    "scope_status",
    "included_work_items",
    "included_modules",
    "included_changes",
    "included_runtime_changes",
    "included_migrations",
    "included_artifacts",
    "excluded_changes",
    "known_limitations",
    "scope_proof",
    "defined_at",
    "defined_by",
    "reviewed_at",
    "reviewed_by",
    "approved_at",
    "approved_by",
    "published_at",
    "archived_at",
)
