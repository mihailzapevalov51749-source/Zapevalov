"""Release Scope Manifest — composition SoT for Unified Release Package (WI-REL-001)."""

from app.modules.platform_release_scope.constants import (
    RELEASE_SCOPE_MANIFEST_KEY,
    RELEASE_SCOPE_SCHEMA_VERSION,
    ReleaseScopeStatus,
)
from app.modules.platform_release_scope.scope import (
    attach_release_scope_to_manifest,
    build_included_changes_from_release_changes,
    build_included_modules_from_bom,
    build_scope_digest_input,
    build_scope_proof,
    compute_scope_digest,
    default_release_scope,
    get_release_scope,
    get_scope_status,
    has_release_scope,
    is_scope_editable,
    set_release_scope,
)

__all__ = [
    "RELEASE_SCOPE_MANIFEST_KEY",
    "RELEASE_SCOPE_SCHEMA_VERSION",
    "ReleaseScopeStatus",
    "attach_release_scope_to_manifest",
    "build_included_changes_from_release_changes",
    "build_included_modules_from_bom",
    "build_scope_digest_input",
    "build_scope_proof",
    "compute_scope_digest",
    "default_release_scope",
    "get_release_scope",
    "get_scope_status",
    "has_release_scope",
    "is_scope_editable",
    "set_release_scope",
]
