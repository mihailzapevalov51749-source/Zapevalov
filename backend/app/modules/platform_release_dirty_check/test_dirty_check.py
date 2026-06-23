"""Tests for Dirty DEV Check (WI-REL-002)."""

from __future__ import annotations

from types import SimpleNamespace

from app.modules.platform_release_dirty_check.checker import (
    run_dirty_dev_check,
    run_dirty_dev_check_for_package,
    verify_scope_proof,
)
from app.modules.platform_release_dirty_check.constants import (
    ISSUE_MODIFIED_OUTSIDE_SCOPE,
    ISSUE_SCOPE_DRIFT,
    ISSUE_UNTRACKED_OUTSIDE_SCOPE,
    DirtyDevCheckStatus,
)
from app.modules.platform_release_dirty_check.worktree import WorktreeSnapshot
from app.modules.platform_release_scope.constants import ReleaseScopeStatus
from app.modules.platform_release_scope.scope import (
    build_scope_proof,
    default_release_scope,
)


def _approved_scope(*, artifacts: list[dict] | None = None, excluded: list[dict] | None = None) -> dict:
    scope = default_release_scope()
    scope["scope_status"] = ReleaseScopeStatus.SCOPE_APPROVED.value
    scope["included_artifacts"] = artifacts or [
        {"artifact_kind": "backend", "path_or_ref": "backend/app/main.py"},
    ]
    scope["excluded_changes"] = excluded or []
    scope["scope_proof"] = build_scope_proof(scope)
    return scope


def test_passed_all_files_match_scope():
    scope = _approved_scope()
    worktree = WorktreeSnapshot(
        repo_root=None,
        modified=("backend/app/main.py",),
        untracked=(),
        deleted=(),
    )
    result = run_dirty_dev_check(scope=scope, worktree=worktree, enforce=True)
    assert result.status == DirtyDevCheckStatus.PASSED
    assert not result.issues


def test_failed_file_outside_scope():
    scope = _approved_scope(
        artifacts=[{"artifact_kind": "backend", "path_or_ref": "backend/app/modules/a/service.py"}]
    )
    worktree = WorktreeSnapshot(
        repo_root=None,
        modified=("backend/app/modules/b/experiment.py",),
    )
    result = run_dirty_dev_check(scope=scope, worktree=worktree, enforce=True)
    assert result.status == DirtyDevCheckStatus.FAILED
    assert any(issue.code == ISSUE_MODIFIED_OUTSIDE_SCOPE for issue in result.issues)


def test_failed_untracked_file_outside_scope():
    scope = _approved_scope(
        artifacts=[{"artifact_kind": "backend", "path_or_ref": "backend/app/main.py"}]
    )
    worktree = WorktreeSnapshot(
        repo_root=None,
        untracked=("backend/app/new_file.py",),
    )
    result = run_dirty_dev_check(scope=scope, worktree=worktree, enforce=True)
    assert result.status == DirtyDevCheckStatus.FAILED
    assert any(issue.code == ISSUE_UNTRACKED_OUTSIDE_SCOPE for issue in result.issues)


def test_failed_scope_drift_after_approval():
    scope = _approved_scope()
    scope["included_changes"] = [{"title": "Extra", "change_type": "other", "risk_level": "low"}]
    result = run_dirty_dev_check(
        scope=scope,
        worktree=WorktreeSnapshot(repo_root=None),
        enforce=True,
    )
    assert result.status == DirtyDevCheckStatus.FAILED
    assert any(issue.code == ISSUE_SCOPE_DRIFT for issue in result.issues)
    assert verify_scope_proof(scope) is not None


def test_scope_proof_valid_passes_drift_check():
    scope = _approved_scope()
    assert verify_scope_proof(scope) is None
    result = run_dirty_dev_check(
        scope=scope,
        worktree=WorktreeSnapshot(repo_root=None),
        enforce=True,
    )
    assert result.status == DirtyDevCheckStatus.PASSED


def test_backward_compat_legacy_package_skipped():
    package = SimpleNamespace(
        id=1,
        status="published",
        package_manifest_json={"title": "Legacy", "governance": {"review_status": "published_to_template"}},
    )
    result = run_dirty_dev_check_for_package(package)
    assert result.status == DirtyDevCheckStatus.SKIPPED
    assert result.skipped is True
    assert not result.enforced


def test_excluded_change_yields_warning_not_failure():
    scope = _approved_scope(
        artifacts=[{"artifact_kind": "backend", "path_or_ref": "backend/app/main.py"}],
        excluded=[
            {
                "title": "Experiment V",
                "reason": "WIP",
                "reference": "backend/app/experiment.py",
            }
        ],
    )
    worktree = WorktreeSnapshot(
        repo_root=None,
        modified=("backend/app/experiment.py",),
    )
    result = run_dirty_dev_check(scope=scope, worktree=worktree, enforce=True)
    assert result.status == DirtyDevCheckStatus.WARNING
    assert result.warnings
    assert not any(issue.code == ISSUE_MODIFIED_OUTSIDE_SCOPE for issue in result.issues)


def test_readiness_gate_blocks_on_failed():
    from app.modules.platform_release_dirty_check.checker import (
        build_readiness_gate_attachment,
        dirty_check_blocks_publish,
    )

    scope = _approved_scope(
        artifacts=[{"artifact_kind": "backend", "path_or_ref": "backend/app/a.py"}]
    )
    result = run_dirty_dev_check(
        scope=scope,
        worktree=WorktreeSnapshot(repo_root=None, modified=("backend/app/b.py",)),
        enforce=True,
    )
    assert dirty_check_blocks_publish(result) is True
    attachment = build_readiness_gate_attachment(result)
    assert attachment["dirty_dev_check"]["blocks_publish"] is True
