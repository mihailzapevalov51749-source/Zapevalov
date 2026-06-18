"""Resolve tenant environment from portal records with legacy id fallback."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap.constants import (
    DEFAULT_BOOTSTRAP_FROM_TENANT_ID,
    PLATFORM_TEMPLATE_TENANT_ID,
)
from app.modules.tenant_bootstrap.exceptions import SourceTenantNotFoundError
from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    LEGACY_TENANT_TYPE_BY_ID,
    TenantStatus,
    TenantType,
)


def resolve_tenant_type_from_id(tenant_id: int) -> TenantType:
    """Temporary compatibility: infer type from well-known tenant ids."""
    if tenant_id in LEGACY_TENANT_TYPE_BY_ID:
        return LEGACY_TENANT_TYPE_BY_ID[tenant_id]
    if tenant_id >= 4:
        return TenantType.CLIENT
    return TenantType.CLIENT


def resolve_portal_tenant_type(portal: Portal | None, *, tenant_id: int | None = None) -> TenantType:
    if portal is not None and portal.tenant_type:
        try:
            return TenantType(str(portal.tenant_type))
        except ValueError:
            pass

    resolved_id = portal.id if portal is not None else tenant_id
    if resolved_id is None:
        return TenantType.CLIENT
    return resolve_tenant_type_from_id(int(resolved_id))


def build_tenant_environment_read(portal: Portal) -> dict[str, object]:
    tenant_type = resolve_portal_tenant_type(portal)
    return {
        "tenant_id": portal.id,
        "tenant_type": tenant_type.value,
        "name": portal.name,
        "short_name": portal.short_name,
        "code": portal.code,
        "template_version": portal.template_version or DEFAULT_TEMPLATE_VERSION,
        "tenant_status": portal.tenant_status or TenantStatus.ACTIVE.value,
        "source_tenant_id": portal.source_tenant_id,
        "notes": portal.notes,
    }


def get_template_tenant(db: Session) -> Portal | None:
    return (
        db.query(Portal)
        .filter(Portal.tenant_type == TenantType.TEMPLATE.value)
        .order_by(Portal.id.asc())
        .first()
    )


def resolve_template_tenant_id(db: Session) -> int | None:
    template = get_template_tenant(db)
    if template is not None:
        return template.id

    legacy = db.query(Portal).filter(Portal.id == PLATFORM_TEMPLATE_TENANT_ID).one_or_none()
    return legacy.id if legacy is not None else None


def resolve_bootstrap_source_tenant_id(db: Session, requested: int | None) -> int | None:
    """
  Resolve clone source for tenant provisioning.

  Legacy schemas default bootstrap_from_tenant_id to PLATFORM_TEMPLATE_TENANT_ID (2).
  After per-environment DB isolation that id may not exist in the current database.
  In that case fall back to resolve_template_tenant_id() instead of failing FK on portals.
  """
    if requested is None:
        return resolve_template_tenant_id(db)

    source = db.query(Portal).filter(Portal.id == requested).one_or_none()
    if source is not None:
        return requested

    if requested in {DEFAULT_BOOTSTRAP_FROM_TENANT_ID, PLATFORM_TEMPLATE_TENANT_ID}:
        return resolve_template_tenant_id(db)

    raise SourceTenantNotFoundError(f"Source tenant portal {requested} not found")
