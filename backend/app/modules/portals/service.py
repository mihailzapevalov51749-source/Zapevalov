from sqlalchemy.orm import Session

from app.modules.portals import repository
from app.modules.portals.schemas import PortalCreate
from app.modules.tenant_bootstrap import clone_tenant_structure
from app.modules.tenant_bootstrap.clone_tenant_structure import CloneTenantStructureResult
from app.modules.tenant_management.delete_tenant import DeleteTenantResult, delete_tenant


def create_portal(
    db: Session,
    data: PortalCreate,
) -> tuple[object, CloneTenantStructureResult | None]:
    portal = repository.create_portal(db, data.name, data.description)

    clone_result: CloneTenantStructureResult | None = None
    if data.bootstrap_from_tenant_id is not None:
        clone_result = clone_tenant_structure(
            db,
            data.bootstrap_from_tenant_id,
            portal.id,
        )

    return portal, clone_result


def get_portals(db: Session):
    return repository.get_portals(db)


def get_portal(db: Session, portal_id: int):
    return repository.get_portal(db, portal_id)


def delete_portal(db: Session, portal_id: int) -> DeleteTenantResult:
    return delete_tenant(db, portal_id)
