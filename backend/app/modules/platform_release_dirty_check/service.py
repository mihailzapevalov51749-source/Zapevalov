"""Service layer for Dirty DEV Check API."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_release_dirty_check.checker import (
    build_readiness_gate_attachment,
    dirty_check_blocks_publish,
    run_dirty_dev_check_for_package,
)
from app.modules.platform_release_dirty_check.schemas import (
    DirtyDevCheckIssueOut,
    DirtyDevCheckResultOut,
)
from app.modules.platform_release_package_registry import service as package_registry_service


def _serialize_result(result) -> DirtyDevCheckResultOut:
    readiness = build_readiness_gate_attachment(result)
    return DirtyDevCheckResultOut(
        status=result.status.value,
        check_version=result.check_version,
        enforced=result.enforced,
        skipped=result.skipped,
        skip_reason=result.skip_reason,
        scope_status=result.scope_status,
        scope_digest_expected=result.scope_digest_expected,
        scope_digest_actual=result.scope_digest_actual,
        repo_root=result.repo_root,
        allowed_paths=list(result.allowed_paths),
        excluded_paths=list(result.excluded_paths),
        issues=[
            DirtyDevCheckIssueOut(
                code=item.code,
                message=item.message,
                path=item.path,
                severity=item.severity,
            )
            for item in result.issues
        ],
        warnings=[
            DirtyDevCheckIssueOut(
                code=item.code,
                message=item.message,
                path=item.path,
                severity=item.severity,
            )
            for item in result.warnings
        ],
        checked_at=result.checked_at,
        blocks_publish=dirty_check_blocks_publish(result),
        readiness_gate=readiness,
    )


def run_dirty_check_for_release(db: Session, release_id: int) -> DirtyDevCheckResultOut:
    package = package_registry_service.get_release_package(db, release_id)
    result = run_dirty_dev_check_for_package(package)
    return _serialize_result(result)
