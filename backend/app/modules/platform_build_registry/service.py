"""Service layer for platform code build registry."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_build_registry.constants import (
    BUILD_KEY_PATTERN,
    COMMIT_SHA_PATTERN,
    PlatformBuildStatus,
)
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.users.models import User

TERMINAL_BUILD_STATUSES: frozenset[str] = frozenset(
    {
        PlatformBuildStatus.SUCCEEDED.value,
        PlatformBuildStatus.FAILED.value,
        PlatformBuildStatus.CANCELLED.value,
    }
)


def list_builds(
    db: Session,
    *,
    status_filter: str | None = None,
) -> list[PlatformCodeBuild]:
    query = db.query(PlatformCodeBuild).order_by(
        PlatformCodeBuild.created_at.desc(),
        PlatformCodeBuild.id.desc(),
    )
    if status_filter:
        query = query.filter(PlatformCodeBuild.status == status_filter.strip().lower())
    return query.all()


def get_build(db: Session, build_id: int) -> PlatformCodeBuild:
    build = (
        db.query(PlatformCodeBuild)
        .filter(PlatformCodeBuild.id == build_id)
        .one_or_none()
    )
    if build is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build не найден",
        )
    return build


def create_build(
    db: Session,
    *,
    build_key: str,
    commit_sha: str,
    backend_digest: str | None = None,
    frontend_digest: str | None = None,
    schema_revision: str | None = None,
    build_manifest_json: dict[str, Any] | None = None,
    actor: User | None = None,
) -> PlatformCodeBuild:
    normalized_build_key = str(build_key or "").strip().upper()
    normalized_commit_sha = str(commit_sha or "").strip().lower()

    if not BUILD_KEY_PATTERN.match(normalized_build_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="build_key должен соответствовать формату BLD-YYYYMMDD-NNNN",
        )
    if not COMMIT_SHA_PATTERN.match(normalized_commit_sha):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="commit_sha должен быть 40-символьным hex SHA",
        )

    manifest = build_manifest_json if isinstance(build_manifest_json, dict) else {}
    if not manifest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="build_manifest_json обязателен",
        )

    existing = (
        db.query(PlatformCodeBuild)
        .filter(PlatformCodeBuild.build_key == normalized_build_key)
        .one_or_none()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Build {normalized_build_key} уже существует",
        )

    build = PlatformCodeBuild(
        build_key=normalized_build_key,
        commit_sha=normalized_commit_sha,
        status=PlatformBuildStatus.PENDING.value,
        backend_digest=backend_digest,
        frontend_digest=frontend_digest,
        schema_revision=schema_revision,
        build_manifest_json=dict(manifest),
        created_by=actor.id if actor and actor.id else None,
    )
    db.add(build)
    db.commit()
    db.refresh(build)
    return build


def start_build(db: Session, *, build_id: int) -> PlatformCodeBuild:
    build = get_build(db, build_id)
    _assert_transition(
        current_status=build.status,
        allowed_from={PlatformBuildStatus.PENDING.value},
        action="start_build",
    )
    build.status = PlatformBuildStatus.RUNNING.value
    build.started_at = datetime.utcnow()
    build.failure_reason = None
    db.commit()
    db.refresh(build)
    return build


def mark_succeeded(db: Session, *, build_id: int) -> PlatformCodeBuild:
    build = get_build(db, build_id)
    _assert_transition(
        current_status=build.status,
        allowed_from={PlatformBuildStatus.RUNNING.value},
        action="mark_succeeded",
    )
    build.status = PlatformBuildStatus.SUCCEEDED.value
    build.finished_at = datetime.utcnow()
    build.failure_reason = None
    db.commit()
    db.refresh(build)
    return build


def mark_failed(
    db: Session,
    *,
    build_id: int,
    failure_reason: str,
) -> PlatformCodeBuild:
    build = get_build(db, build_id)
    _assert_transition(
        current_status=build.status,
        allowed_from={PlatformBuildStatus.RUNNING.value},
        action="mark_failed",
    )
    reason = str(failure_reason or "").strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="failure_reason обязателен",
        )
    build.status = PlatformBuildStatus.FAILED.value
    build.finished_at = datetime.utcnow()
    build.failure_reason = reason
    db.commit()
    db.refresh(build)
    return build


def cancel_build(db: Session, *, build_id: int) -> PlatformCodeBuild:
    build = get_build(db, build_id)
    _assert_transition(
        current_status=build.status,
        allowed_from={
            PlatformBuildStatus.PENDING.value,
            PlatformBuildStatus.RUNNING.value,
        },
        action="cancel_build",
    )
    build.status = PlatformBuildStatus.CANCELLED.value
    build.finished_at = datetime.utcnow()
    db.commit()
    db.refresh(build)
    return build


def _assert_transition(*, current_status: str, allowed_from: set[str], action: str) -> None:
    if current_status in TERMINAL_BUILD_STATUSES and current_status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Статус {current_status} терминальный, операция {action} запрещена",
        )
    if current_status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Переход {current_status} -> {action} запрещен",
        )
