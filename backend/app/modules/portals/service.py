from sqlalchemy.orm import Session

from app.modules.portals import repository
from app.modules.portals.schemas import PortalCreate
from app.modules.tenant_bootstrap import clone_tenant_structure
from app.modules.tenant_bootstrap.clone_tenant_structure import CloneTenantStructureResult
from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    TenantStatus,
    TenantType,
)
from app.modules.tenant_environment.resolver import resolve_template_tenant_id
from app.modules.tenant_management.delete_tenant import DeleteTenantResult, delete_tenant


def _resolve_bootstrap_source_tenant_id(db: Session, requested: int | None) -> int | None:
    if requested is not None:
        return requested
    return resolve_template_tenant_id(db)


def _template_version_for_source(db: Session, source_tenant_id: int | None) -> str:
    if source_tenant_id is None:
        return DEFAULT_TEMPLATE_VERSION
    source = repository.get_portal(db, source_tenant_id)
    if source is None or not source.template_version:
        return DEFAULT_TEMPLATE_VERSION
    return str(source.template_version)


def create_portal(
    db: Session,
    data: PortalCreate,
) -> tuple[object, CloneTenantStructureResult | None]:
    source_tenant_id = _resolve_bootstrap_source_tenant_id(db, data.bootstrap_from_tenant_id)
    portal = repository.create_portal(
        db,
        name=data.name,
        description=data.description,
        tenant_type=TenantType.CLIENT.value,
        template_version=_template_version_for_source(db, source_tenant_id),
        tenant_status=TenantStatus.ACTIVE.value,
        source_tenant_id=source_tenant_id,
    )

    clone_result: CloneTenantStructureResult | None = None
    if source_tenant_id is not None:
        clone_result = clone_tenant_structure(
            db,
            source_tenant_id,
            portal.id,
        )

    return portal, clone_result


def get_portals(db: Session):
    return repository.get_portals(db)


def get_portal(db: Session, portal_id: int):
    return repository.get_portal(db, portal_id)


def delete_portal(db: Session, portal_id: int) -> DeleteTenantResult:
    return delete_tenant(db, portal_id)
