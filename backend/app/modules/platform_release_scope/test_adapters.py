"""Adapter regression: release_scope on legacy packages."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from app.modules.platform_release_package_registry import adapters


def _package(*, manifest: dict | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        id=55,
        package_key="PKG-20260619-0001",
        platform_version="9.9.9",
        build_id=3,
        status="draft",
        package_manifest_json=dict(manifest or {"title": "Legacy release"}),
        module_bom_json={"modules": []},
        release_notes=None,
        created_by=1,
        created_at=datetime(2026, 6, 19, 10, 0, 0),
        published_at=None,
    )


def test_platform_release_out_includes_default_scope_for_legacy_package():
    out = adapters.package_to_platform_release_out(_package())
    assert out.release_scope is not None
    assert out.release_scope.scope_status == "draft"
    assert out.release_scope.included_changes == []


def test_platform_release_out_includes_defined_scope():
    manifest = {
        "title": "Scoped release",
        "release_scope": {
            "scope_version": "1.0",
            "scope_status": "scope_defined",
            "included_work_items": [{"key": "WI-REL-001", "title": "Scope manifest"}],
            "included_modules": [],
            "included_changes": [{"title": "A", "change_type": "feature", "risk_level": "low"}],
            "included_runtime_changes": [],
            "included_migrations": [],
            "included_artifacts": [],
            "excluded_changes": [{"title": "B", "reason": "wip"}],
            "known_limitations": [],
            "scope_proof": {
                "proof_version": "1.0",
                "scope_digest": "a" * 64,
                "computed_at": "2026-06-19T10:00:00Z",
                "included_count": {"changes": 1},
                "excluded_count": {"changes": 1},
                "summary": "test",
            },
        },
    }
    out = adapters.package_to_platform_release_out(_package(manifest=manifest))
    assert out.release_scope.scope_status == "scope_defined"
    assert out.release_scope.included_work_items[0]["key"] == "WI-REL-001"
    assert out.release_scope.excluded_changes[0]["title"] == "B"
