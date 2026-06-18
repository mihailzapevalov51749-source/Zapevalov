"""CRUD helpers for tenant module update offers."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_module_update_offers.constants import (
    ACTIVE_OFFER_STATUSES,
    TenantModuleUpdateOfferStatus,
)
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer


def list_offers_for_tenant(db: Session, tenant_id: int) -> list[TenantModuleUpdateOffer]:
    return (
        db.query(TenantModuleUpdateOffer)
        .filter(TenantModuleUpdateOffer.tenant_id == tenant_id)
        .order_by(
            TenantModuleUpdateOffer.module_key.asc(),
            TenantModuleUpdateOffer.offered_at.desc(),
        )
        .all()
    )


def list_offers_for_tenant_module(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> list[TenantModuleUpdateOffer]:
    return (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == tenant_id,
            TenantModuleUpdateOffer.module_key == module_key,
        )
        .order_by(TenantModuleUpdateOffer.offered_at.desc())
        .all()
    )


def get_offer(db: Session, *, tenant_id: int, offer_id: int) -> TenantModuleUpdateOffer | None:
    return (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == tenant_id,
            TenantModuleUpdateOffer.id == offer_id,
        )
        .one_or_none()
    )


def get_available_offer_for_module(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> TenantModuleUpdateOffer | None:
    return (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == tenant_id,
            TenantModuleUpdateOffer.module_key == module_key,
            TenantModuleUpdateOffer.status.in_(ACTIVE_OFFER_STATUSES),
        )
        .order_by(TenantModuleUpdateOffer.offered_at.desc())
        .first()
    )


def list_all_offers(db: Session) -> list[TenantModuleUpdateOffer]:
    return (
        db.query(TenantModuleUpdateOffer)
        .order_by(
            TenantModuleUpdateOffer.tenant_id.asc(),
            TenantModuleUpdateOffer.module_key.asc(),
            TenantModuleUpdateOffer.offered_at.desc(),
        )
        .all()
    )


def withdraw_available_offers_for_module(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> int:
    rows = (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == tenant_id,
            TenantModuleUpdateOffer.module_key == module_key,
            TenantModuleUpdateOffer.status == TenantModuleUpdateOfferStatus.AVAILABLE,
        )
        .all()
    )
    for row in rows:
        row.status = TenantModuleUpdateOfferStatus.WITHDRAWN
    return len(rows)
