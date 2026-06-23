"""Package digest computation (ADR-PROVENANCE-001 §8)."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def _canonical_json_bytes(payload: dict[str, Any]) -> bytes:
    """Deterministic UTF-8 JSON for digest input (sorted keys, compact)."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode(
        "utf-8"
    )


def build_package_digest_input(
    *,
    package_key: str,
    platform_version: str,
    code_layer: dict[str, Any],
    module_bom_json: dict[str, Any],
) -> dict[str, Any]:
    """
    Canonical immutable input for package_digest.

    Excludes display fields (title, description, changes) and package_digest itself.
    Includes technical keys and code-layer provenance only.
    """
    return {
        "package_key": str(package_key).strip().upper(),
        "platform_version": str(platform_version).strip(),
        "code_layer": {
            "build_id": code_layer.get("build_id"),
            "build_key": code_layer.get("build_key"),
            "commit_sha": code_layer.get("commit_sha"),
            "backend_digest": code_layer.get("backend_digest"),
            "frontend_digest": code_layer.get("frontend_digest"),
            "schema_revision": code_layer.get("schema_revision"),
        },
        "module_bom_json": module_bom_json or {},
    }


def compute_package_digest(
    *,
    package_key: str,
    platform_version: str,
    code_layer: dict[str, Any],
    module_bom_json: dict[str, Any],
) -> str:
    """
    SHA-256 hex digest of canonical immutable package provenance fields.

    Algorithm (WI-IMPL-002):
    1. Build canonical dict via build_package_digest_input().
    2. Serialize to sorted compact JSON.
    3. SHA-256 hex digest of UTF-8 bytes.
    """
    payload = build_package_digest_input(
        package_key=package_key,
        platform_version=platform_version,
        code_layer=code_layer,
        module_bom_json=module_bom_json,
    )
    return hashlib.sha256(_canonical_json_bytes(payload)).hexdigest()
