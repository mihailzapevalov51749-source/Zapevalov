"""Tests for Release Scope Manifest (WI-REL-001)."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from app.modules.platform_release_scope.constants import ReleaseScopeStatus
from app.modules.platform_release_scope.scope import (
    attach_release_scope_to_manifest,
    build_included_changes_from_release_changes,
    build_scope_proof,
    compute_scope_digest,
    default_release_scope,
    get_release_scope,
    has_release_scope,
    is_scope_editable,
    set_release_scope,
)


def _package(
    *,
    status: str = "draft",
    manifest: dict | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=101,
        status=status,
        package_manifest_json=dict(manifest or {}),
    )


def test_default_release_scope_shape():
    scope = default_release_scope()
    assert scope["scope_version"] == "1.0"
    assert scope["scope_status"] == ReleaseScopeStatus.DRAFT.value
    assert scope["included_work_items"] == []
    assert scope["excluded_changes"] == []
    assert scope["scope_proof"] is None


def test_get_release_scope_fills_missing_block():
    package = _package()
    scope = get_release_scope(package)
    assert scope["scope_status"] == ReleaseScopeStatus.DRAFT.value
    assert not has_release_scope(package)


def test_attach_release_scope_creates_block_with_proof():
    changes = [
        {
            "change_type": "feature",
            "title": "Готовое изменение A",
            "description": "desc",
            "risk_level": "low",
            "system_key": "runtime.chat",
        }
    ]
    manifest = attach_release_scope_to_manifest(
        {"title": "Test release"},
        included_changes=build_included_changes_from_release_changes(changes),
        actor_user_id=7,
    )
    assert "release_scope" in manifest
    scope = manifest["release_scope"]
    assert scope["scope_status"] == ReleaseScopeStatus.SCOPE_DEFINED.value
    assert len(scope["included_changes"]) == 1
    assert scope["defined_by"] == 7
    assert scope["scope_proof"]["scope_digest"]
    assert scope["scope_proof"]["included_count"]["changes"] == 1


def test_one_release_one_scope_via_manifest_key():
    package = _package()
    set_release_scope(
        package,
        {
            **default_release_scope(),
            "included_changes": [{"title": "A", "change_type": "other", "risk_level": "low"}],
            "scope_status": ReleaseScopeStatus.SCOPE_DEFINED.value,
            "scope_proof": build_scope_proof(
                {
                    **default_release_scope(),
                    "included_changes": [{"title": "A", "change_type": "other", "risk_level": "low"}],
                }
            ),
        },
    )
    assert has_release_scope(package)
    assert len(get_release_scope(package)["included_changes"]) == 1


def test_included_and_excluded_changes_persisted():
    scope = {
        **default_release_scope(),
        "included_changes": [{"title": "A", "change_type": "feature", "risk_level": "low"}],
        "excluded_changes": [
            {
                "title": "Незавершённое B",
                "reason": "WIP — не входит в релиз",
                "reference": "backend/app/modules/foo/service.py",
            }
        ],
        "scope_status": ReleaseScopeStatus.SCOPE_DEFINED.value,
    }
    scope["scope_proof"] = build_scope_proof(scope)
    package = _package()
    set_release_scope(package, scope)

    stored = get_release_scope(package)
    assert stored["included_changes"][0]["title"] == "A"
    assert stored["excluded_changes"][0]["title"] == "Незавершённое B"
    assert stored["scope_proof"]["excluded_count"]["changes"] == 1


def test_scope_digest_stable_for_same_content():
    scope = {
        **default_release_scope(),
        "included_work_items": [{"key": "P1-W06", "title": "WI"}],
        "excluded_changes": [{"title": "Experiment V", "reason": "out of scope"}],
    }
    digest_a = compute_scope_digest(scope)
    digest_b = compute_scope_digest(scope)
    assert digest_a == digest_b
    assert len(digest_a) == 64


def test_scope_digest_changes_when_excluded_changes_change():
    base = {**default_release_scope(), "included_changes": [{"title": "A", "change_type": "other", "risk_level": "low"}]}
    with_exclusion = {
        **base,
        "excluded_changes": [{"title": "B", "reason": "wip"}],
    }
    assert compute_scope_digest(base) != compute_scope_digest(with_exclusion)


def test_backward_compat_package_without_release_scope():
    package = _package(manifest={"title": "Legacy", "governance": {"review_status": "draft"}})
    scope = get_release_scope(package)
    assert scope["scope_status"] == ReleaseScopeStatus.DRAFT.value
    assert scope["included_changes"] == []


def test_is_scope_editable_only_for_draft_package():
    editable = _package(status="draft")
    set_release_scope(editable, {**default_release_scope(), "scope_status": ReleaseScopeStatus.SCOPE_DEFINED.value})
    assert is_scope_editable(editable) is True

    locked = _package(status="ready")
    assert is_scope_editable(locked) is False


def test_build_included_changes_from_objects():
    change = SimpleNamespace(
        change_type="bugfix",
        entity_type=None,
        entity_id=None,
        system_key="core.auth",
        title="Fix login",
        description=None,
        risk_level="medium",
    )
    result = build_included_changes_from_release_changes([change])
    assert result[0]["title"] == "Fix login"
    assert result[0]["system_key"] == "core.auth"
