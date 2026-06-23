"""Release provenance contracts (ADR-PROVENANCE-001, WI-IMPL-002/003)."""

from app.modules.platform_release_provenance.bridge import (
    detect_release_drift,
    verify_manifest_against_package,
    verify_package_against_build,
    verify_release_provenance,
    verify_runtime_against_manifest,
)
from app.modules.platform_release_provenance.digest import compute_package_digest
from app.modules.platform_release_provenance.manifest import (
    build_code_layer_manifest,
    build_physical_manifest_provenance,
    validate_physical_manifest,
    validate_package_manifest_provenance,
)
from app.modules.platform_release_provenance.types import VerifyIssue, VerifyResult
from app.modules.platform_release_provenance.verify_gate import (
    build_verify_proof,
    deployment_verify_passed,
    record_deployment_verify_audit,
    resolve_verify_failure_reason,
    run_deployment_verify_gate,
)

__all__ = [
    "VerifyIssue",
    "VerifyResult",
    "build_code_layer_manifest",
    "build_physical_manifest_provenance",
    "build_verify_proof",
    "compute_package_digest",
    "deployment_verify_passed",
    "detect_release_drift",
    "record_deployment_verify_audit",
    "resolve_verify_failure_reason",
    "run_deployment_verify_gate",
    "validate_package_manifest_provenance",
    "validate_physical_manifest",
    "verify_manifest_against_package",
    "verify_package_against_build",
    "verify_release_provenance",
    "verify_runtime_against_manifest",
]
