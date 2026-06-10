from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    TenantStatus,
    TenantType,
)


def create_portal(
    db: Session,
    *,
    name: str,
    description: str | None,
    tenant_type: str = TenantType.CLIENT.value,
    template_version: str = DEFAULT_TEMPLATE_VERSION,
    tenant_status: str = TenantStatus.ACTIVE.value,
    source_tenant_id: int | None = None,
    notes: str | None = None,
) -> Portal:
    portal = Portal(
        name=name,
        description=description,
        tenant_type=tenant_type,
        template_version=template_version,
        tenant_status=tenant_status,
        source_tenant_id=source_tenant_id,
        notes=notes,
    )
    db.add(portal)
    db.commit()
    db.refresh(portal)
    return portal


def get_portals(db: Session):
    return db.query(Portal).order_by(Portal.id.asc()).all()


def get_portal(db: Session, portal_id: int) -> Portal | None:
    return db.query(Portal).filter(Portal.id == portal_id).one_or_none()