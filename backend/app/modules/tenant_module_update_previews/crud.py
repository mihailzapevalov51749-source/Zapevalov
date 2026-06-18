"""CRUD helpers for tenant module update previews."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_module_update_previews.constants import TenantModuleUpdatePreviewStatus
from app.modules.tenant_module_update_previews.models import TenantModuleUpdatePreview


def list_previews_for_tenant(db: Session, tenant_id: int) -> list[TenantModuleUpdatePreview]:
    return (
        db.query(TenantModuleUpdatePreview)
        .filter(TenantModuleUpdatePreview.tenant_id == tenant_id)
        .order_by(
            TenantModuleUpdatePreview.generated_at.desc(),
            TenantModuleUpdatePreview.id.desc(),
        )
        .all()
    )


def get_preview(
    db: Session,
    *,
    tenant_id: int,
    preview_id: int,
) -> TenantModuleUpdatePreview | None:
    return (
        db.query(TenantModuleUpdatePreview)
        .filter(
            TenantModuleUpdatePreview.tenant_id == tenant_id,
            TenantModuleUpdatePreview.id == preview_id,
        )
        .one_or_none()
    )


def get_current_preview_for_offer(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
) -> TenantModuleUpdatePreview | None:
    return (
        db.query(TenantModuleUpdatePreview)
        .filter(
            TenantModuleUpdatePreview.tenant_id == tenant_id,
            TenantModuleUpdatePreview.offer_id == offer_id,
            TenantModuleUpdatePreview.preview_status == TenantModuleUpdatePreviewStatus.GENERATED,
        )
        .order_by(
            TenantModuleUpdatePreview.generated_at.desc(),
            TenantModuleUpdatePreview.id.desc(),
        )
        .first()
    )


def list_generated_previews_for_offer(
    db: Session,
    *,
    offer_id: int,
) -> list[TenantModuleUpdatePreview]:
    return (
        db.query(TenantModuleUpdatePreview)
        .filter(
            TenantModuleUpdatePreview.offer_id == offer_id,
            TenantModuleUpdatePreview.preview_status == TenantModuleUpdatePreviewStatus.GENERATED,
        )
        .all()
    )


def list_all_previews(db: Session) -> list[TenantModuleUpdatePreview]:
    return (
        db.query(TenantModuleUpdatePreview)
        .order_by(
            TenantModuleUpdatePreview.generated_at.desc(),
            TenantModuleUpdatePreview.tenant_id.asc(),
            TenantModuleUpdatePreview.module_key.asc(),
        )
        .all()
    )


def mark_generated_previews_superseded_for_offer(db: Session, *, offer_id: int) -> int:
    rows = list_generated_previews_for_offer(db, offer_id=offer_id)
    for row in rows:
        row.preview_status = TenantModuleUpdatePreviewStatus.SUPERSEDED
    return len(rows)


def mark_previews_outdated_for_offer(db: Session, *, offer_id: int) -> int:
    rows = (
        db.query(TenantModuleUpdatePreview)
        .filter(
            TenantModuleUpdatePreview.offer_id == offer_id,
            TenantModuleUpdatePreview.preview_status.in_(
                (
                    TenantModuleUpdatePreviewStatus.GENERATED,
                    TenantModuleUpdatePreviewStatus.SUPERSEDED,
                )
            ),
        )
        .all()
    )
    for row in rows:
        row.preview_status = TenantModuleUpdatePreviewStatus.OUTDATED
    return len(rows)
