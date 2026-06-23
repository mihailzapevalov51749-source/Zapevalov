"""Tests for release provenance (WI-IMPL-002)."""

from __future__ import annotations

from app.modules.platform_release_provenance.digest import (
    build_package_digest_input,
    compute_package_digest,
)
from app.modules.platform_release_provenance.manifest import (
    build_physical_manifest_provenance,
    validate_package_manifest_provenance,
    validate_physical_manifest,
)


def _sample_code_layer() -> dict:
    return {
        "build_id": 42,
        "build_key": "BLD-20260619-0001",
        "commit_sha": "a" * 40,
        "backend_digest": "b" * 64,
        "frontend_digest": "c" * 64,
        "schema_revision": "api-adapter-v1.0.0",
    }


def test_compute_package_digest_is_deterministic() -> None:
    module_bom = {"modules": [{"module_key": "core"}]}
    first = compute_package_digest(
        package_key="pkg-20260619-0001",
        platform_version="v1.0.0",
        code_layer=_sample_code_layer(),
        module_bom_json=module_bom,
    )
    second = compute_package_digest(
        package_key="PKG-20260619-0001",
        platform_version="v1.0.0",
        code_layer=_sample_code_layer(),
        module_bom_json=module_bom,
    )
    assert first == second
    assert len(first) == 64


def test_package_digest_ignores_display_fields_in_input_builder() -> None:
    canonical = build_package_digest_input(
        package_key="PKG-20260619-0002",
        platform_version="v1.0.1",
        code_layer=_sample_code_layer(),
        module_bom_json={"modules": []},
    )
    assert "title" not in canonical
    assert "description" not in canonical
    assert canonical["package_key"] == "PKG-20260619-0002"


def test_validate_physical_manifest_legacy_ok() -> None:
    legacy = {
        "release_id": "release-019",
        "git_commit": "d" * 40,
        "frontend_digest": "e" * 64,
        "backend_fingerprint": {"hash": "f" * 64, "version": "1"},
    }
    assert validate_physical_manifest(legacy) == []


def test_validate_physical_manifest_full_provenance_requires_all_fields() -> None:
    partial = {
        "release_id": "release-020",
        "git_commit": "d" * 40,
        "frontend_digest": "e" * 64,
        "backend_fingerprint": {"hash": "f" * 64},
        "runtime_slot_key": "template",
    }
    errors = validate_physical_manifest(partial)
    assert any("incomplete provenance" in err for err in errors)


def test_build_physical_manifest_provenance_fields() -> None:
    provenance = build_physical_manifest_provenance(
        release_package_id=7,
        package_key="pkg-20260619-0003",
        build_id=42,
        build_key="bld-20260619-0001",
        runtime_slot_key="template",
    )
    manifest = {
        "release_id": "release-021",
        "git_commit": "a" * 40,
        "frontend_digest": "b" * 64,
        "backend_fingerprint": {"hash": "c" * 64},
        **provenance,
    }
    assert validate_physical_manifest(manifest) == []
    assert manifest["package_key"] == "PKG-20260619-0003"
    assert manifest["build_key"] == "BLD-20260619-0001"


def test_validate_package_manifest_provenance_accepts_digest() -> None:
    manifest = {
        "package_digest": "a" * 64,
        "code_layer": {
            "build_id": 1,
            "build_key": "BLD-20260619-0001",
            "commit_sha": "b" * 40,
        },
    }
    assert validate_package_manifest_provenance(manifest) == []
