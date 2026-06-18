from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_management.exceptions import (
    ProtectedTenantDeleteForbiddenError,
    SystemTenantDeleteForbiddenError,
    TenantNotFoundError,
)
from app.modules.tenant_management.tenant_write_policy import (
    assert_tenant_allows_archive,
    assert_tenant_allows_delete,
)


@dataclass(frozen=True)
class ArchiveTenantResult:
    tenant_id: int
    tenant_name: str
    tenant_status: str
    is_active: bool


def archive_tenant(db: Session, tenant_id: int) -> ArchiveTenantResult:
    try:
        assert_tenant_allows_archive(db, tenant_id)
    except ProtectedTenantDeleteForbiddenError as exc:
        raise SystemTenantDeleteForbiddenError(str(exc)) from exc

    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        raise TenantNotFoundError(f"Tenant portal {tenant_id} not found")

    portal.is_active = False
    portal.tenant_status = TenantStatus.ARCHIVED.value
    db.add(portal)
    db.commit()
    db.refresh(portal)

    return ArchiveTenantResult(
        tenant_id=tenant_id,
        tenant_name=portal.name,
        tenant_status=str(portal.tenant_status),
        is_active=bool(portal.is_active),
    )


def assert_tenant_is_archivable(db: Session, tenant_id: int) -> Portal:
    try:
        assert_tenant_allows_archive(db, tenant_id)
    except ProtectedTenantDeleteForbiddenError as exc:
        raise SystemTenantDeleteForbiddenError(str(exc)) from exc

    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        raise TenantNotFoundError(f"Tenant portal {tenant_id} not found")
    return portal
