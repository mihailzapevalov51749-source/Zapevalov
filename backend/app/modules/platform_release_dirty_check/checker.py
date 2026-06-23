"""Dirty DEV Check engine — compare git worktree vs Release Scope Manifest."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.runtime_paths import try_dev_monorepo_root
from app.modules.platform_release_dirty_check.constants import (
    DEBUG_ARTIFACT_PATTERNS,
    DIRTY_CHECK_VERSION,
    ENFORCEMENT_SCOPE_STATUSES,
    ISSUE_DEBUG_ARTIFACT,
    ISSUE_ENFORCEMENT_DISABLED,
    ISSUE_EXCLUDED_CHANGE_PRESENT,
    ISSUE_GIT_UNAVAILABLE,
    ISSUE_MODIFIED_OUTSIDE_SCOPE,
    ISSUE_OUTSIDE_SCOPE,
    ISSUE_SCOPE_DRIFT,
    ISSUE_SCOPE_PROOF_MISSING,
    ISSUE_TEST_ARTIFACT,
    ISSUE_UNTRACKED_OUTSIDE_SCOPE,
    TEST_ARTIFACT_PATTERNS,
    CODE_ROOT_PREFIXES,
    DirtyDevCheckStatus,
)
from app.modules.platform_release_dirty_check.worktree import (
    WorktreeSnapshot,
    collect_git_worktree_snapshot,
    normalize_repo_relative_path,
)
from app.modules.platform_release_scope.constants import ReleaseScopeStatus
from app.modules.platform_release_scope.scope import (
    build_scope_proof,
    compute_scope_digest,
    get_release_scope,
    has_release_scope,
)


@dataclass(frozen=True)
class DirtyDevCheckIssue:
    code: str
    message: str
    path: str | None = None
    severity: str = "error"

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "path": self.path,
            "severity": self.severity,
        }


@dataclass
class DirtyDevCheckResult:
    status: DirtyDevCheckStatus
    check_version: str = DIRTY_CHECK_VERSION
    enforced: bool = False
    skipped: bool = False
    skip_reason: str | None = None
    scope_status: str | None = None
    scope_digest_expected: str | None = None
    scope_digest_actual: str | None = None
    repo_root: str | None = None
    allowed_paths: list[str] = field(default_factory=list)
    excluded_paths: list[str] = field(default_factory=list)
    issues: list[DirtyDevCheckIssue] = field(default_factory=list)
    warnings: list[DirtyDevCheckIssue] = field(default_factory=list)
    checked_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status.value,
            "check_version": self.check_version,
            "enforced": self.enforced,
            "skipped": self.skipped,
            "skip_reason": self.skip_reason,
            "scope_status": self.scope_status,
            "scope_digest_expected": self.scope_digest_expected,
            "scope_digest_actual": self.scope_digest_actual,
            "repo_root": self.repo_root,
            "allowed_paths": list(self.allowed_paths),
            "excluded_paths": list(self.excluded_paths),
            "issues": [item.to_dict() for item in self.issues],
            "warnings": [item.to_dict() for item in self.warnings],
            "checked_at": self.checked_at,
        }


def _extract_paths_from_scope(scope: dict[str, Any]) -> tuple[list[str], list[str]]:
    allowed: list[str] = []
    excluded: list[str] = []

    artifacts = scope.get("included_artifacts")
    if isinstance(artifacts, list):
        for item in artifacts:
            if not isinstance(item, dict):
                continue
            ref = normalize_repo_relative_path(str(item.get("path_or_ref") or ""))
            if ref:
                allowed.append(ref)

    changes = scope.get("included_changes")
    if isinstance(changes, list):
        for item in changes:
            if not isinstance(item, dict):
                continue
            for key in ("reference", "path_or_ref", "system_key"):
                ref = item.get(key)
                if ref and "/" in str(ref):
                    allowed.append(normalize_repo_relative_path(str(ref)))

    excluded_items = scope.get("excluded_changes")
    if isinstance(excluded_items, list):
        for item in excluded_items:
            if not isinstance(item, dict):
                continue
            ref = normalize_repo_relative_path(str(item.get("reference") or ""))
            if ref:
                excluded.append(ref)

    return sorted(set(allowed)), sorted(set(excluded))


def _path_matches_allowed(path: str, allowed_paths: list[str]) -> bool:
    normalized = normalize_repo_relative_path(path)
    for allowed in allowed_paths:
        if normalized == allowed:
            return True
        if allowed.endswith("/") and normalized.startswith(allowed):
            return True
        if normalized.startswith(f"{allowed}/"):
            return True
    return False


def _path_matches_excluded(path: str, excluded_paths: list[str]) -> bool:
    normalized = normalize_repo_relative_path(path)
    for excluded in excluded_paths:
        if normalized == excluded:
            return True
        if excluded.endswith("/") and normalized.startswith(excluded):
            return True
        if normalized.startswith(f"{excluded}/"):
            return True
    return False


def _matches_patterns(path: str, patterns: tuple[re.Pattern[str], ...]) -> bool:
    normalized = normalize_repo_relative_path(path)
    return any(pattern.search(normalized) for pattern in patterns)


def should_enforce_dirty_check(scope: dict[str, Any]) -> bool:
    """
    Enforcement applies when scope is defined with artifact list or approved lifecycle.

    Legacy packages without artifacts remain non-blocking (backward compatibility).
    """
    status = str(scope.get("scope_status") or ReleaseScopeStatus.DRAFT.value).strip().lower()
    allowed, _ = _extract_paths_from_scope(scope)
    if status in ENFORCEMENT_SCOPE_STATUSES and allowed:
        return True
    if status in {
        ReleaseScopeStatus.SCOPE_APPROVED.value,
        ReleaseScopeStatus.SCOPE_REVIEWED.value,
    }:
        return True
    return False


def verify_scope_proof(scope: dict[str, Any]) -> DirtyDevCheckIssue | None:
    proof = scope.get("scope_proof")
    if not isinstance(proof, dict):
        return DirtyDevCheckIssue(
            code=ISSUE_SCOPE_PROOF_MISSING,
            message="scope_proof отсутствует — нельзя доказать утверждённый состав релиза",
        )
    expected = str(proof.get("scope_digest") or "").strip().lower()
    if len(expected) != 64:
        return DirtyDevCheckIssue(
            code=ISSUE_SCOPE_PROOF_MISSING,
            message="scope_proof.scope_digest отсутствует или некорректен",
        )
    actual = compute_scope_digest(scope)
    if expected != actual:
        return DirtyDevCheckIssue(
            code=ISSUE_SCOPE_DRIFT,
            message="scope_proof.scope_digest не совпадает с текущим Release Scope (scope drift)",
        )
    return None


def run_dirty_dev_check(
    *,
    scope: dict[str, Any],
    worktree: WorktreeSnapshot | None = None,
    repo_root: Path | None = None,
    enforce: bool | None = None,
) -> DirtyDevCheckResult:
    """
    Compare DEV working tree against Release Scope Manifest.

    Does not mutate scope or touch publish pipeline.
    """
    scope_status = str(scope.get("scope_status") or ReleaseScopeStatus.DRAFT.value)
    allowed_paths, excluded_paths = _extract_paths_from_scope(scope)
    enforced = should_enforce_dirty_check(scope) if enforce is None else enforce

    resolved_root = repo_root or (worktree.repo_root if worktree else None) or try_dev_monorepo_root()
    result = DirtyDevCheckResult(
        status=DirtyDevCheckStatus.PASSED,
        enforced=enforced,
        scope_status=scope_status,
        repo_root=str(resolved_root) if resolved_root else None,
        allowed_paths=allowed_paths,
        excluded_paths=excluded_paths,
    )

    if not enforced:
        result.status = DirtyDevCheckStatus.SKIPPED
        result.skipped = True
        result.skip_reason = (
            "Dirty DEV Check не применяется: Release Scope без artifact enforcement "
            "(legacy / draft release)."
        )
        result.warnings.append(
            DirtyDevCheckIssue(
                code=ISSUE_ENFORCEMENT_DISABLED,
                message=result.skip_reason,
                severity="info",
            )
        )
        return result

    drift_issue = verify_scope_proof(scope)
    proof = scope.get("scope_proof") if isinstance(scope.get("scope_proof"), dict) else {}
    result.scope_digest_expected = str(proof.get("scope_digest") or "").strip().lower() or None
    result.scope_digest_actual = compute_scope_digest(scope)
    if drift_issue is not None:
        result.issues.append(drift_issue)

    if worktree is None:
        if resolved_root is None:
            result.issues.append(
                DirtyDevCheckIssue(
                    code=ISSUE_GIT_UNAVAILABLE,
                    message="Monorepo root недоступен — Dirty DEV Check невозможен",
                )
            )
            result.status = DirtyDevCheckStatus.FAILED
            return _finalize_result(result)

        worktree = collect_git_worktree_snapshot(resolved_root, code_root_prefixes=CODE_ROOT_PREFIXES)

    if not worktree.git_available:
        result.issues.append(
            DirtyDevCheckIssue(
                code=ISSUE_GIT_UNAVAILABLE,
                message=f"Git недоступен: {worktree.error or 'unknown error'}",
            )
        )
        result.status = DirtyDevCheckStatus.FAILED
        return _finalize_result(result)

    if not allowed_paths:
        result.warnings.append(
            DirtyDevCheckIssue(
                code=ISSUE_ENFORCEMENT_DISABLED,
                message="included_artifacts пуст — file-level enforcement ограничен scope_proof only",
                severity="warning",
            )
        )

    for path in worktree.all_changed:
        if _path_matches_excluded(path, excluded_paths):
            result.warnings.append(
                DirtyDevCheckIssue(
                    code=ISSUE_EXCLUDED_CHANGE_PRESENT,
                    message="Изменение в DEV явно исключено из Release Scope",
                    path=path,
                    severity="warning",
                )
            )
            continue

        if allowed_paths and not _path_matches_allowed(path, allowed_paths):
            code = ISSUE_UNTRACKED_OUTSIDE_SCOPE if path in worktree.untracked else ISSUE_MODIFIED_OUTSIDE_SCOPE
            if code == ISSUE_MODIFIED_OUTSIDE_SCOPE and path in worktree.deleted:
                code = ISSUE_OUTSIDE_SCOPE
            result.issues.append(
                DirtyDevCheckIssue(
                    code=code,
                    message="Файл изменён в DEV, но не входит в Release Scope included_artifacts",
                    path=path,
                )
            )
            continue

        if _matches_patterns(path, DEBUG_ARTIFACT_PATTERNS):
            result.issues.append(
                DirtyDevCheckIssue(
                    code=ISSUE_DEBUG_ARTIFACT,
                    message="Обнаружен debug/temp артефакт в working tree",
                    path=path,
                )
            )

        if _matches_patterns(path, TEST_ARTIFACT_PATTERNS) and not _path_matches_allowed(path, allowed_paths):
            result.issues.append(
                DirtyDevCheckIssue(
                    code=ISSUE_TEST_ARTIFACT,
                    message="Обнаружен test/temporary артефакт вне Release Scope",
                    path=path,
                )
            )

    return _finalize_result(result)


def run_dirty_dev_check_for_package(package: Any) -> DirtyDevCheckResult:
    scope = get_release_scope(package)
    if not has_release_scope(package):
        return DirtyDevCheckResult(
            status=DirtyDevCheckStatus.SKIPPED,
            skipped=True,
            skip_reason="Release Scope отсутствует — legacy package",
            scope_status=str(scope.get("scope_status") or ReleaseScopeStatus.DRAFT.value),
            enforced=False,
        )
    return run_dirty_dev_check(scope=scope)


def _finalize_result(result: DirtyDevCheckResult) -> DirtyDevCheckResult:
    errors = [issue for issue in result.issues if issue.severity != "warning"]
    if errors:
        result.status = DirtyDevCheckStatus.FAILED
    elif result.warnings:
        result.status = DirtyDevCheckStatus.WARNING
    elif result.skipped:
        result.status = DirtyDevCheckStatus.SKIPPED
    else:
        result.status = DirtyDevCheckStatus.PASSED
    return result


def dirty_check_blocks_publish(result: DirtyDevCheckResult) -> bool:
    """Hook for WI-REL-004 Release Readiness Gate."""
    return result.status == DirtyDevCheckStatus.FAILED


def build_readiness_gate_attachment(result: DirtyDevCheckResult) -> dict[str, Any]:
    """Payload for future orchestrator VALIDATING phase (WI-REL-004)."""
    from app.modules.platform_release_dirty_check.constants import READINESS_GATE_HOOK_KEY

    return {
        READINESS_GATE_HOOK_KEY: {
            "check_version": result.check_version,
            "status": result.status.value,
            "blocks_publish": dirty_check_blocks_publish(result),
            "enforced": result.enforced,
            "skipped": result.skipped,
            "skip_reason": result.skip_reason,
            "scope_digest_expected": result.scope_digest_expected,
            "scope_digest_actual": result.scope_digest_actual,
            "issue_count": len(result.issues),
            "warning_count": len(result.warnings),
            "checked_at": result.checked_at,
        }
    }
