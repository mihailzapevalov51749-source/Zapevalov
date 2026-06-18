"""Database operations for platform release pipeline (tenant updates only)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_release.models import TenantUpdateOffer, TenantVersion


def get_tenant_version(db: Session, tenant_id: int) -> TenantVersion | None:
    return (
        db.query(TenantVersion)
        .filter(TenantVersion.tenant_id == tenant_id)
        .one_or_none()
    )


def list_tenant_update_offers(
    db: Session,
    tenant_id: int,
    *,
    status: str | None = None,
) -> list[TenantUpdateOffer]:
    query = (
        db.query(TenantUpdateOffer)
        .filter(TenantUpdateOffer.tenant_id == tenant_id)
        .order_by(TenantUpdateOffer.created_at.desc(), TenantUpdateOffer.id.desc())
    )
    if status:
        query = query.filter(TenantUpdateOffer.status == status)
    return query.all()


def get_tenant_update_offer(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
) -> TenantUpdateOffer | None:
    return (
        db.query(TenantUpdateOffer)
        .filter(
            TenantUpdateOffer.id == offer_id,
            TenantUpdateOffer.tenant_id == tenant_id,
        )
        .one_or_none()
    )


def get_existing_offer_for_release(
    db: Session,
    *,
    tenant_id: int,
    release_id: int,
) -> TenantUpdateOffer | None:
    return (
        db.query(TenantUpdateOffer)
        .filter(
            TenantUpdateOffer.tenant_id == tenant_id,
            TenantUpdateOffer.release_id == release_id,
        )
        .one_or_none()
    )


def create_tenant_update_offer(
    db: Session,
    *,
    tenant_id: int,
    release_id: int,
    from_version: str,
    to_version: str,
) -> TenantUpdateOffer:
    offer = TenantUpdateOffer(
        tenant_id=tenant_id,
        release_id=release_id,
        from_version=from_version,
        to_version=to_version,
        status="available",
    )
    db.add(offer)
    db.flush()
    return offer
