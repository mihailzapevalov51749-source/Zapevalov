"""Constants for release provenance contracts."""

from __future__ import annotations

PHYSICAL_MANIFEST_SCHEMA_VERSION = "1.1"
PACKAGE_MANIFEST_PROVENANCE_VERSION = "1.0"

# Physical manifest.json — registry linkage (ADR-PROVENANCE-001 §5.3).
PHYSICAL_MANIFEST_PROVENANCE_FIELDS: frozenset[str] = frozenset(
    {
        "release_package_id",
        "package_key",
        "build_id",
        "build_key",
        "runtime_slot_key",
    }
)

# Legacy physical manifest fields (pre-WI-IMPL-002).
PHYSICAL_MANIFEST_LEGACY_REQUIRED_FIELDS: frozenset[str] = frozenset(
    {
        "release_id",
        "git_commit",
        "frontend_digest",
        "backend_fingerprint",
    }
)
