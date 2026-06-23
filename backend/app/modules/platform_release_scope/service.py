"""Service layer for Release Scope Manifest (WI-REL-001)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_release_package_registry import service as package_registry_service
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_release_scope.constants import (
    EDITABLE_SCOPE_STATUSES,
    ReleaseScopeStatus,
)
from app.modules.platform_release_scope.scope import (
    build_scope_proof,
    get_release_scope,
    get_scope_status,
    is_scope_editable,
    scope_has_defined_content,
    set_release_scope,
)
from app.modules.platform_release_scope.schemas import (
    ReleaseScopeOut,
    ReleaseScopeProofOut,
    ReleaseScopeUpsert,
)
from app.modules.users.models import User


def _serialize_scope_proof(raw: Any) -> ReleaseScopeProofOut | None:
    if not isinstance(raw, dict):
        return None
    scope_digest = str(raw.get("scope_digest") or "").strip()
    if len(scope_digest) != 64:
        return None
    return ReleaseScopeProofOut(
        proof_version=str(raw.get("proof_version") or "1.0"),
        scope_digest=scope_digest,
        computed_at=str(raw.get("computed_at") or ""),
        included_count=dict(raw.get("included_count") or {}),
        excluded_count=dict(raw.get("excluded_count") or {}),
        summary=str(raw.get("summary") or ""),
    )


def serialize_release_scope(package: PlatformReleasePackage) -> ReleaseScopeOut:
    scope = get_release_scope(package)
    return ReleaseScopeOut(
        scope_version=str(scope.get("scope_version") or "1.0"),
        scope_status=str(scope.get("scope_status") or ReleaseScopeStatus.DRAFT.value),
        included_work_items=list(scope.get("included_work_items") or []),
        included_modules=list(scope.get("included_modules") or []),
        included_changes=list(scope.get("included_changes") or []),
        included_runtime_changes=list(scope.get("included_runtime_changes") or []),
        included_migrations=list(scope.get("included_migrations") or []),
        included_artifacts=list(scope.get("included_artifacts") or []),
        excluded_changes=list(scope.get("excluded_changes") or []),
        known_limitations=list(scope.get("known_limitations") or []),
        scope_proof=_serialize_scope_proof(scope.get("scope_proof")),
        defined_at=scope.get("defined_at"),
        defined_by=scope.get("defined_by"),
        reviewed_at=scope.get("reviewed_at"),
        reviewed_by=scope.get("reviewed_by"),
        approved_at=scope.get("approved_at"),
        approved_by=scope.get("approved_by"),
        published_at=scope.get("published_at"),
        archived_at=scope.get("archived_at"),
    )


def get_release_scope_for_package(db: Session, release_id: int) -> ReleaseScopeOut:
    package = package_registry_service.get_release_package(db, release_id)
    return serialize_release_scope(package)


def _assert_scope_mutable(package: PlatformReleasePackage) -> None:
    if not is_scope_editable(package):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Release scope можно редактировать только для package в статусе draft "
                f"и scope_status in {sorted(EDITABLE_SCOPE_STATUSES)}"
            ),
        )


def _upsert_payload_to_scope_dict(payload: ReleaseScopeUpsert) -> dict[str, Any]:
    return {
        "included_work_items": [item.model_dump() for item in payload.included_work_items],
        "included_modules": [item.model_dump() for item in payload.included_modules],
        "included_changes": [item.model_dump() for item in payload.included_changes],
        "included_runtime_changes": [item.model_dump() for item in payload.included_runtime_changes],
        "included_migrations": [item.model_dump() for item in payload.included_migrations],
        "included_artifacts": [item.model_dump() for item in payload.included_artifacts],
        "excluded_changes": [item.model_dump() for item in payload.excluded_changes],
        "known_limitations": [item.model_dump() for item in payload.known_limitations],
    }


def upsert_release_scope(
    db: Session,
    *,
    release_id: int,
    payload: ReleaseScopeUpsert,
    actor: User | None = None,
) -> ReleaseScopeOut:
    package = package_registry_service.get_release_package(db, release_id)
    _assert_scope_mutable(package)

    current = get_release_scope(package)
    updates = _upsert_payload_to_scope_dict(payload)
    current.update(updates)

    if scope_has_defined_content(current):
        current["scope_status"] = ReleaseScopeStatus.SCOPE_DEFINED.value
        current["defined_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
            "+00:00", "Z"
        )
        if actor is not None and actor.id is not None:
            current["defined_by"] = int(actor.id)
    else:
        current["scope_status"] = ReleaseScopeStatus.DRAFT.value

    current["scope_proof"] = build_scope_proof(current)
    set_release_scope(package, current)
    db.commit()
    db.refresh(package)
    return serialize_release_scope(package)


def recompute_scope_proof(db: Session, *, release_id: int) -> ReleaseScopeOut:
    """Refresh scope_proof digest without changing scope lists (readiness prep)."""
    package = package_registry_service.get_release_package(db, release_id)
    current = get_release_scope(package)
    current["scope_proof"] = build_scope_proof(current)
    set_release_scope(package, current)
    db.commit()
    db.refresh(package)
    return serialize_release_scope(package)


def _assert_scope_transition(
    *,
    current_status: str,
    allowed_from: set[str],
    action: str,
) -> None:
    if current_status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Переход scope_status={current_status} -> {action} запрещён",
        )


def mark_scope_reviewed(
    db: Session,
    *,
    release_id: int,
    actor: User,
) -> ReleaseScopeOut:
    package = package_registry_service.get_release_package(db, release_id)
    current = get_release_scope(package)
    _assert_scope_transition(
        current_status=get_scope_status(package),
        allowed_from={ReleaseScopeStatus.SCOPE_DEFINED.value},
        action="mark_scope_reviewed",
    )
    if not scope_has_defined_content(current):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Release scope пуст — нельзя перевести в scope_reviewed",
        )
    current["scope_status"] = ReleaseScopeStatus.SCOPE_REVIEWED.value
    current["reviewed_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )
    current["reviewed_by"] = actor.id
    current["scope_proof"] = build_scope_proof(current)
    set_release_scope(package, current)
    db.commit()
    db.refresh(package)
    return serialize_release_scope(package)


def approve_release_scope(
    db: Session,
    *,
    release_id: int,
    actor: User,
) -> ReleaseScopeOut:
    package = package_registry_service.get_release_package(db, release_id)
    current = get_release_scope(package)
    _assert_scope_transition(
        current_status=get_scope_status(package),
        allowed_from={ReleaseScopeStatus.SCOPE_REVIEWED.value},
        action="approve_release_scope",
    )
    current["scope_status"] = ReleaseScopeStatus.SCOPE_APPROVED.value
    current["approved_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )
    current["approved_by"] = actor.id
    current["scope_proof"] = build_scope_proof(current)
    set_release_scope(package, current)
    db.commit()
    db.refresh(package)
    return serialize_release_scope(package)
