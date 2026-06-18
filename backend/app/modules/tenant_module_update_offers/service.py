"""Service layer for tenant module update offers."""

from __future__ import annotations

from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_release.resolvers import resolve_release_version
from app.modules.portals.models import Portal
from app.modules.tenant_module_update_offers import crud
from app.modules.tenant_module_update_offers.generator import _split_change_summary
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_offers.schemas import (
    TenantModuleUpdateOfferBriefOut,
    TenantModuleUpdateOfferDetailOut,
    TenantModuleUpdateOfferOut,
)
from sqlalchemy.orm import Session


def _resolve_module_title(db: Session, module_key: str) -> str | None:
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    return module.title if module is not None else None


def _resolve_tenant_name(db: Session, tenant_id: int) -> str | None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    return portal.name if portal is not None else None


def _resolve_release_version(db: Session, release_id: int | None) -> str | None:
    return resolve_release_version(db, release_id)


def serialize_offer(
    db: Session,
    offer: TenantModuleUpdateOffer,
    *,
    include_change_items: bool = False,
) -> TenantModuleUpdateOfferOut | TenantModuleUpdateOfferDetailOut:
    payload = {
        "id": offer.id,
        "tenant_id": offer.tenant_id,
        "tenant_name": _resolve_tenant_name(db, offer.tenant_id),
        "module_key": offer.module_key,
        "module_title": _resolve_module_title(db, offer.module_key),
        "from_version": offer.from_version,
        "to_version": offer.to_version,
        "release_id": offer.release_id,
        "release_version": _resolve_release_version(db, offer.release_id),
        "publication_id": getattr(offer, "publication_id", None),
        "status": offer.status,
        "offered_at": offer.offered_at,
        "applied_at": offer.applied_at,
        "skipped_at": offer.skipped_at,
        "change_summary": offer.change_summary,
        "notes": offer.notes,
    }

    if not include_change_items:
        return TenantModuleUpdateOfferOut(**payload)

    return TenantModuleUpdateOfferDetailOut(
        **payload,
        change_items=_split_change_summary(offer.change_summary),
    )


def serialize_offer_brief(db: Session, offer: TenantModuleUpdateOffer) -> TenantModuleUpdateOfferBriefOut:
    return TenantModuleUpdateOfferBriefOut(
        id=offer.id,
        from_version=offer.from_version,
        to_version=offer.to_version,
        release_version=_resolve_release_version(db, offer.release_id),
        change_summary=offer.change_summary,
        status=offer.status,
    )


def list_tenant_offers(db: Session, tenant_id: int) -> list[TenantModuleUpdateOfferOut]:
    return [serialize_offer(db, offer) for offer in crud.list_offers_for_tenant(db, tenant_id)]


def list_module_offers(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> list[TenantModuleUpdateOfferOut]:
    return [
        serialize_offer(db, offer)
        for offer in crud.list_offers_for_tenant_module(db, tenant_id=tenant_id, module_key=module_key)
    ]


def get_tenant_offer(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
) -> TenantModuleUpdateOfferDetailOut | None:
    offer = crud.get_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if offer is None:
        return None
    return serialize_offer(db, offer, include_change_items=True)


def list_all_offers(db: Session) -> list[TenantModuleUpdateOfferOut]:
    return [serialize_offer(db, offer) for offer in crud.list_all_offers(db)]


def get_available_offer_brief(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> TenantModuleUpdateOfferBriefOut | None:
    offer = crud.get_available_offer_for_module(db, tenant_id=tenant_id, module_key=module_key)
    if offer is None:
        return None
    return serialize_offer_brief(db, offer)
