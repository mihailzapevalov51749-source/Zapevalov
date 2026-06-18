"""Service layer for platform release package registry."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_build_registry.constants import PlatformBuildStatus
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_release.constants import PlatformReleaseStatus
from app.modules.platform_release_package_registry.constants import (
    PACKAGE_KEY_PATTERN,
    PACKAGE_REVIEW_COUNT_STATUSES,
    PACKAGE_REVIEW_QUEUE_STATUSES,
    PlatformReleasePackageStatus,
)
from app.modules.platform_release_package_registry.governance import (
    SUBMIT_FOR_REVIEW_SOURCE_GOVERNANCE_STATUSES,
    get_review_status,
    set_governance,
)
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.users.models import User

IMMUTABLE_FROM_READY_FIELDS: frozenset[str] = frozenset(
    {
        "build_id",
        "platform_version",
        "module_bom_json",
        "package_manifest_json",
    }
)

TERMINAL_STATUSES: frozenset[str] = frozenset(
    {
        PlatformReleasePackageStatus.CANCELLED.value,
        PlatformReleasePackageStatus.DEPRECATED.value,
    }
)


def list_release_packages(
    db: Session,
    *,
    status_filter: str | None = None,
) -> list[PlatformReleasePackage]:
    query = db.query(PlatformReleasePackage).order_by(
        PlatformReleasePackage.created_at.desc(),
        PlatformReleasePackage.id.desc(),
    )
    if status_filter:
        query = query.filter(PlatformReleasePackage.status == status_filter.strip().lower())
    return query.all()


def get_release_package(db: Session, package_id: int) -> PlatformReleasePackage:
    package = (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.id == package_id)
        .one_or_none()
    )
    if package is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release package не найден",
        )
    return package


def create_release_package(
    db: Session,
    *,
    package_key: str,
    build_id: int,
    platform_version: str,
    package_manifest_json: dict[str, Any],
    module_bom_json: dict[str, Any],
    actor: User | None = None,
) -> PlatformReleasePackage:
    normalized_package_key = str(package_key or "").strip().upper()
    normalized_platform_version = str(platform_version or "").strip()

    if not PACKAGE_KEY_PATTERN.match(normalized_package_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="package_key должен соответствовать формату PKG-YYYYMMDD-NNNN",
        )
    if not normalized_platform_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="platform_version обязателен",
        )
    if not isinstance(package_manifest_json, dict) or not package_manifest_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="package_manifest_json обязателен",
        )
    if not isinstance(module_bom_json, dict) or not module_bom_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="module_bom_json обязателен",
        )

    _get_succeeded_build_or_400(db, build_id)

    if (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.package_key == normalized_package_key)
        .one_or_none()
        is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Release package {normalized_package_key} уже существует",
        )

    if (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.platform_version == normalized_platform_version)
        .one_or_none()
        is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"platform_version {normalized_platform_version} уже используется",
        )

    package = PlatformReleasePackage(
        package_key=normalized_package_key,
        build_id=build_id,
        platform_version=normalized_platform_version,
        status=PlatformReleasePackageStatus.DRAFT.value,
        package_manifest_json=dict(package_manifest_json),
        module_bom_json=dict(module_bom_json),
        created_by=actor.id if actor and actor.id else None,
    )
    db.add(package)
    db.commit()
    db.refresh(package)
    return package


def mark_ready(db: Session, *, package_id: int) -> PlatformReleasePackage:
    package = get_release_package(db, package_id)
    _assert_transition(
        current_status=package.status,
        allowed_from={PlatformReleasePackageStatus.DRAFT.value},
        action="mark_ready",
    )
    build = _get_succeeded_build_or_400(db, package.build_id)
    _assert_package_readiness(db, package, build)

    package.status = PlatformReleasePackageStatus.READY.value
    package.ready_at = datetime.utcnow()
    db.commit()
    db.refresh(package)
    return package


def publish_package(db: Session, *, package_id: int) -> PlatformReleasePackage:
    package = get_release_package(db, package_id)
    _assert_transition(
        current_status=package.status,
        allowed_from={PlatformReleasePackageStatus.READY.value},
        action="publish_package",
    )
    package.status = PlatformReleasePackageStatus.PUBLISHED.value
    package.published_at = datetime.utcnow()
    db.commit()
    db.refresh(package)
    return package


def cancel_package(
    db: Session,
    *,
    package_id: int,
    cancellation_reason: str,
    actor: User | None = None,
) -> PlatformReleasePackage:
    package = get_release_package(db, package_id)
    _assert_transition(
        current_status=package.status,
        allowed_from={
            PlatformReleasePackageStatus.DRAFT.value,
            PlatformReleasePackageStatus.READY.value,
        },
        action="cancel_package",
    )
    reason = str(cancellation_reason or "").strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cancellation_reason обязателен",
        )

    package.status = PlatformReleasePackageStatus.CANCELLED.value
    package.cancelled_at = datetime.utcnow()
    package.cancelled_by = actor.id if actor and actor.id else None
    package.cancellation_reason = reason
    db.commit()
    db.refresh(package)
    return package


def deprecate_package(db: Session, *, package_id: int) -> PlatformReleasePackage:
    package = get_release_package(db, package_id)
    _assert_transition(
        current_status=package.status,
        allowed_from={PlatformReleasePackageStatus.PUBLISHED.value},
        action="deprecate_package",
    )
    package.status = PlatformReleasePackageStatus.DEPRECATED.value
    package.deprecated_at = datetime.utcnow()
    db.commit()
    db.refresh(package)
    return package


def list_review_queue_packages(db: Session) -> list[PlatformReleasePackage]:
    """Packages in platform review queue (governance.review_status)."""
    statuses = sorted(PACKAGE_REVIEW_QUEUE_STATUSES)
    return (
        db.query(PlatformReleasePackage)
        .filter(
            PlatformReleasePackage.package_manifest_json["governance"]["review_status"].astext.in_(
                statuses,
            ),
        )
        .order_by(
            PlatformReleasePackage.created_at.desc(),
            PlatformReleasePackage.id.desc(),
        )
        .all()
    )


def count_review_queue_packages(db: Session) -> int:
    """Count packages awaiting or in active platform review."""
    statuses = sorted(PACKAGE_REVIEW_COUNT_STATUSES)
    return (
        db.query(PlatformReleasePackage)
        .filter(
            PlatformReleasePackage.package_manifest_json["governance"]["review_status"].astext.in_(
                statuses,
            ),
        )
        .count()
    )


def submit_for_review(
    db: Session,
    *,
    package_id: int,
    actor: User,
) -> PlatformReleasePackage:
    package = get_release_package(db, package_id)
    current = get_review_status(package)
    _assert_governance_review_transition(
        current_status=current,
        allowed_from=set(SUBMIT_FOR_REVIEW_SOURCE_GOVERNANCE_STATUSES),
        action="submit_for_review",
    )

    now = datetime.utcnow()
    set_governance(
        package,
        {
            "review_status": PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value,
            "submitted_at": now.isoformat(),
            "submitted_by": actor.id,
        },
    )
    db.commit()
    db.refresh(package)
    return package


def start_review(
    db: Session,
    *,
    package_id: int,
    actor: User,
) -> PlatformReleasePackage:
    package = get_release_package(db, package_id)
    current = get_review_status(package)
    _assert_governance_review_transition(
        current_status=current,
        allowed_from={PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value},
        action="start_review",
    )

    now = datetime.utcnow()
    set_governance(
        package,
        {
            "review_status": PlatformReleaseStatus.IN_PLATFORM_REVIEW.value,
            "review_started_at": now.isoformat(),
            "review_started_by": actor.id,
        },
    )
    db.commit()
    db.refresh(package)
    return package


def request_changes(
    db: Session,
    *,
    package_id: int,
    comment: str,
    actor: User,
) -> PlatformReleasePackage:
    package = get_release_package(db, package_id)
    current = get_review_status(package)
    _assert_governance_review_transition(
        current_status=current,
        allowed_from={PlatformReleaseStatus.IN_PLATFORM_REVIEW.value},
        action="request_changes",
    )

    normalized_comment = str(comment or "").strip()
    if not normalized_comment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Комментарий обязателен при возврате на доработку",
        )

    now = datetime.utcnow()
    set_governance(
        package,
        {
            "review_status": PlatformReleaseStatus.CHANGES_REQUESTED.value,
            "review_comment": normalized_comment,
            "changes_requested_at": now.isoformat(),
            "changes_requested_by": actor.id,
        },
    )
    db.commit()
    db.refresh(package)
    return package


def approve_package(
    db: Session,
    *,
    package_id: int,
    actor: User,
    comment: str | None = None,
) -> PlatformReleasePackage:
    package = get_release_package(db, package_id)
    current = get_review_status(package)
    _assert_governance_review_transition(
        current_status=current,
        allowed_from={PlatformReleaseStatus.IN_PLATFORM_REVIEW.value},
        action="approve_package",
    )

    now = datetime.utcnow()
    updates: dict[str, Any] = {
        "review_status": PlatformReleaseStatus.APPROVED_BY_PLATFORM.value,
        "approved_at": now.isoformat(),
        "approved_by": actor.id,
    }
    normalized_comment = str(comment or "").strip() if comment else ""
    if normalized_comment:
        updates["review_comment"] = normalized_comment

    set_governance(package, updates)
    db.commit()
    db.refresh(package)
    return package


def assert_immutable_from_ready(
    package: PlatformReleasePackage,
    *,
    next_build_id: int | None = None,
    next_platform_version: str | None = None,
    next_package_manifest_json: dict[str, Any] | None = None,
    next_module_bom_json: dict[str, Any] | None = None,
) -> None:
    """
    Guard helper for future update operations.

    Once package reaches ready/published/deprecated/cancelled, immutable fields
    cannot be changed.
    """

    if package.status not in {
        PlatformReleasePackageStatus.READY.value,
        PlatformReleasePackageStatus.PUBLISHED.value,
        PlatformReleasePackageStatus.DEPRECATED.value,
        PlatformReleasePackageStatus.CANCELLED.value,
    }:
        return

    if next_build_id is not None and next_build_id != package.build_id:
        _raise_immutable_field_error("build_id")
    if next_platform_version is not None and next_platform_version != package.platform_version:
        _raise_immutable_field_error("platform_version")
    if next_package_manifest_json is not None and next_package_manifest_json != (package.package_manifest_json or {}):
        _raise_immutable_field_error("package_manifest_json")
    if next_module_bom_json is not None and next_module_bom_json != (package.module_bom_json or {}):
        _raise_immutable_field_error("module_bom_json")


def _raise_immutable_field_error(field_name: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Поле {field_name} immutable начиная со статуса ready",
    )


def _get_succeeded_build_or_400(db: Session, build_id: int) -> PlatformCodeBuild:
    build = _get_build_or_400(db, build_id)
    _assert_build_succeeded(build)
    return build


def _assert_build_succeeded(build: PlatformCodeBuild) -> None:
    if build.status != PlatformBuildStatus.SUCCEEDED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Release package можно создать только из succeeded build",
        )


def _get_build_or_400(db: Session, build_id: int) -> PlatformCodeBuild:
    build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == build_id).one_or_none()
    if build is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Build {build_id} не найден",
        )
    return build


def _assert_governance_review_transition(
    *,
    current_status: str,
    allowed_from: set[str],
    action: str,
) -> None:
    if current_status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Переход governance.review_status={current_status} -> {action} запрещён"
            ),
        )


def _assert_transition(
    *,
    current_status: str,
    allowed_from: set[str],
    action: str,
) -> None:
    if current_status in TERMINAL_STATUSES and current_status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Статус {current_status} терминальный, операция {action} запрещена",
        )
    if current_status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Переход {current_status} -> {action} запрещен",
        )


def _assert_package_readiness(
    db: Session,
    package: PlatformReleasePackage,
    build: PlatformCodeBuild,
) -> None:
    if not package.platform_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="platform_version обязателен",
        )
    if not isinstance(package.package_manifest_json, dict) or not package.package_manifest_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="package_manifest_json обязателен",
        )
    if not isinstance(package.module_bom_json, dict) or not package.module_bom_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="module_bom_json обязателен",
        )

    duplicate = (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.platform_version == package.platform_version)
        .filter(PlatformReleasePackage.id != package.id)
        .one_or_none()
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"platform_version {package.platform_version} уже используется",
        )

    _assert_optional_metadata_consistency(package=package, build=build)


def _assert_optional_metadata_consistency(
    *,
    package: PlatformReleasePackage,
    build: PlatformCodeBuild,
) -> None:
    manifest = package.package_manifest_json if isinstance(package.package_manifest_json, dict) else {}
    build_manifest = build.build_manifest_json if isinstance(build.build_manifest_json, dict) else {}

    manifest_build_id = manifest.get("build_id")
    if manifest_build_id is not None and int(manifest_build_id) != int(build.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="package_manifest_json.build_id не совпадает с build_id package",
        )

    manifest_commit = manifest.get("commit_sha")
    if manifest_commit is not None and str(manifest_commit) != str(build.commit_sha):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="package_manifest_json.commit_sha не совпадает с build.commit_sha",
        )

    manifest_schema = manifest.get("schema_revision")
    if manifest_schema is not None and str(manifest_schema) != str(build.schema_revision):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="package_manifest_json.schema_revision не совпадает с build.schema_revision",
        )

    build_manifest_schema = build_manifest.get("schema_revision")
    if (
        build_manifest_schema is not None
        and build.schema_revision is not None
        and str(build_manifest_schema) != str(build.schema_revision)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="build_manifest_json.schema_revision не совпадает с build.schema_revision",
        )
