"""Tenant Registry query service."""

from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType

from .schemas import TenantRegistryDetail, TenantRegistryListItem, TenantRegistrySummary


def _apply_registry_filters(
    query,
    *,
    tenant_type: TenantType | None,
    tenant_status: TenantStatus | None,
    search: str | None,
):
    if tenant_type is not None:
        query = query.filter(Portal.tenant_type == tenant_type.value)

    if tenant_status is not None:
        query = query.filter(Portal.tenant_status == tenant_status.value)

    normalized_search = str(search or "").strip()
    if normalized_search:
        search_filters = [Portal.name.ilike(f"%{normalized_search}%")]

        if normalized_search.isdigit():
            search_filters.append(Portal.id == int(normalized_search))

        query = query.filter(or_(*search_filters))

    return query


def list_tenant_registry(
    db: Session,
    *,
    tenant_type: TenantType | None = None,
    tenant_status: TenantStatus | None = None,
    search: str | None = None,
) -> list[TenantRegistryListItem]:
    query = db.query(Portal).order_by(Portal.id.asc())
    query = _apply_registry_filters(
        query,
        tenant_type=tenant_type,
        tenant_status=tenant_status,
        search=search,
    )

    return [
        TenantRegistryListItem(
            id=portal.id,
            name=portal.name,
            tenant_type=TenantType(portal.tenant_type),
            template_version=str(portal.template_version or ""),
            source_tenant_id=portal.source_tenant_id,
            tenant_status=TenantStatus(portal.tenant_status),
        )
        for portal in query.all()
    ]


def get_tenant_registry_item(db: Session, tenant_id: int) -> TenantRegistryDetail | None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        return None

    return TenantRegistryDetail(
        id=portal.id,
        name=portal.name,
        tenant_type=TenantType(portal.tenant_type),
        template_version=str(portal.template_version or ""),
        source_tenant_id=portal.source_tenant_id,
        tenant_status=TenantStatus(portal.tenant_status),
        notes=portal.notes,
        description=portal.description,
    )


def summarize_tenant_registry(db: Session) -> TenantRegistrySummary:
    portals = db.query(Portal).order_by(Portal.id.asc()).all()

    by_type: dict[str, int] = {item.value: 0 for item in TenantType}
    by_status: dict[str, int] = {item.value: 0 for item in TenantStatus}

    for portal in portals:
        tenant_type = str(portal.tenant_type or TenantType.CLIENT.value)
        tenant_status = str(portal.tenant_status or TenantStatus.ACTIVE.value)
        by_type[tenant_type] = by_type.get(tenant_type, 0) + 1
        by_status[tenant_status] = by_status.get(tenant_status, 0) + 1

    return TenantRegistrySummary(
        total=len(portals),
        by_type=by_type,
        by_status=by_status,
    )
