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
        original_name=name,
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


def find_portal_by_code(db: Session, code: str, *, exclude_portal_id: int | None = None) -> Portal | None:
    query = db.query(Portal).filter(Portal.code == code)
    if exclude_portal_id is not None:
        query = query.filter(Portal.id != exclude_portal_id)
    return query.one_or_none()


def find_portal_by_public_slug(
    db: Session,
    public_slug: str,
    *,
    exclude_portal_id: int | None = None,
) -> Portal | None:
    query = db.query(Portal).filter(Portal.public_slug == public_slug)
    if exclude_portal_id is not None:
        query = query.filter(Portal.id != exclude_portal_id)
    return query.one_or_none()


def update_portal_general_settings(
    db: Session,
    portal: Portal,
    *,
    name: str,
    short_name: str | None,
    public_slug: str,
    public_slug_locked: bool,
    description: str | None,
    timezone: str,
    date_format: str,
    time_format: str,
    week_start_day: str,
    default_language: str,
) -> Portal:
    portal.name = name
    portal.short_name = short_name
    portal.public_slug = public_slug
    portal.public_slug_locked = public_slug_locked
    portal.description = description
    portal.timezone = timezone
    portal.date_format = date_format
    portal.time_format = time_format
    portal.week_start_day = week_start_day
    portal.default_language = default_language
    db.add(portal)
    db.commit()
    db.refresh(portal)
    return portal