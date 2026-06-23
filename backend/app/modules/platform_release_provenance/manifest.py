"""Physical and package manifest provenance helpers."""

from __future__ import annotations

from typing import Any

from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_release_provenance.constants import (
    PACKAGE_MANIFEST_PROVENANCE_VERSION,
    PHYSICAL_MANIFEST_LEGACY_REQUIRED_FIELDS,
    PHYSICAL_MANIFEST_PROVENANCE_FIELDS,
    PHYSICAL_MANIFEST_SCHEMA_VERSION,
)


def build_code_layer_manifest(build: PlatformCodeBuild) -> dict[str, Any]:
    return {
        "build_id": build.id,
        "build_key": build.build_key,
        "commit_sha": build.commit_sha,
        "backend_digest": build.backend_digest,
        "frontend_digest": build.frontend_digest,
        "schema_revision": build.schema_revision,
    }


def attach_package_provenance_to_manifest(
    manifest: dict[str, Any],
    *,
    package_key: str,
    platform_version: str,
    code_layer: dict[str, Any],
    module_bom_json: dict[str, Any],
    package_digest: str,
) -> dict[str, Any]:
    enriched = dict(manifest or {})
    enriched["provenance_version"] = PACKAGE_MANIFEST_PROVENANCE_VERSION
    enriched["code_layer"] = dict(code_layer)
    enriched["package_digest"] = package_digest
    enriched["package_key"] = str(package_key).strip().upper()
    enriched["platform_version"] = str(platform_version).strip()
    return enriched


def build_physical_manifest_provenance(
    *,
    release_package_id: int,
    package_key: str,
    build_id: int,
    build_key: str,
    runtime_slot_key: str,
) -> dict[str, Any]:
    return {
        "manifest_schema_version": PHYSICAL_MANIFEST_SCHEMA_VERSION,
        "release_package_id": int(release_package_id),
        "package_key": str(package_key).strip().upper(),
        "build_id": int(build_id),
        "build_key": str(build_key).strip().upper(),
        "runtime_slot_key": str(runtime_slot_key).strip(),
    }


def validate_physical_manifest(manifest: dict[str, Any]) -> list[str]:
    """Return validation errors; empty list = valid. Legacy manifests allowed."""
    errors: list[str] = []
    if not isinstance(manifest, dict):
        return ["manifest must be a dict"]

    for field in PHYSICAL_MANIFEST_LEGACY_REQUIRED_FIELDS:
        if field not in manifest or manifest[field] in (None, ""):
            errors.append(f"missing legacy field: {field}")

    backend_fp = manifest.get("backend_fingerprint")
    if isinstance(backend_fp, dict):
        if not backend_fp.get("hash") and manifest.get("frontend_digest"):
            pass
    elif "backend_fingerprint" in manifest:
        errors.append("backend_fingerprint must be an object with hash when present")

    present_provenance = {
        field for field in PHYSICAL_MANIFEST_PROVENANCE_FIELDS if manifest.get(field) not in (None, "")
    }
    if not present_provenance:
        return errors

    missing = PHYSICAL_MANIFEST_PROVENANCE_FIELDS - present_provenance
    if missing:
        errors.append(f"incomplete provenance linkage: missing {sorted(missing)}")
        return errors

    for int_field in ("release_package_id", "build_id"):
        value = manifest.get(int_field)
        if not isinstance(value, int) or value <= 0:
            errors.append(f"{int_field} must be a positive integer")

    for key_field in ("package_key", "build_key"):
        value = str(manifest.get(key_field) or "").strip()
        if not value:
            errors.append(f"{key_field} must be non-empty")

    slot = str(manifest.get("runtime_slot_key") or "").strip()
    if not slot:
        errors.append("runtime_slot_key must be non-empty")

    return errors


def validate_package_manifest_provenance(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(manifest, dict):
        return ["package manifest must be a dict"]

    if "package_digest" not in manifest:
        return errors

    digest = manifest.get("package_digest")
    if not isinstance(digest, str) or len(digest) != 64:
        errors.append("package_digest must be a 64-char sha256 hex string")

    code_layer = manifest.get("code_layer")
    if not isinstance(code_layer, dict):
        errors.append("code_layer must be present when package_digest is set")
    else:
        for field in ("build_id", "build_key", "commit_sha"):
            if not code_layer.get(field):
                errors.append(f"code_layer.{field} is required")

    return errors
