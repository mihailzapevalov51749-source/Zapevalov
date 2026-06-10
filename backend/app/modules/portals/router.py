from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.tenant_environment.resolver import build_tenant_environment_read
from app.modules.tenant_environment.schemas import TenantEnvironmentRead
from app.modules.tenant_bootstrap import clone_tenant_structure
from app.modules.tenant_bootstrap.exceptions import (
    SourceTenantHasNoStructureError,
    SourceTenantNotFoundError,
    TargetTenantAlreadyHasStructureError,
    TargetTenantNotFoundError,
)
from app.modules.tenant_management.exceptions import (
    SystemTenantDeleteForbiddenError,
    TenantNotFoundError,
)
from app.modules.tenant_bootstrap.schemas import (
    CloneTenantStructureRequest,
    CloneTenantStructureResponse,
)

from . import service
from .schemas import PortalCreate, PortalResponse

router = APIRouter(prefix="/portals", tags=["Portals"])


def _portal_response(portal, clone_result=None) -> PortalResponse:
    return PortalResponse(
        id=portal.id,
        name=portal.name,
        description=portal.description,
        is_active=portal.is_active,
        created_at=portal.created_at,
        tenant_type=portal.tenant_type,
        template_version=portal.template_version,
        tenant_status=portal.tenant_status,
        source_tenant_id=portal.source_tenant_id,
        notes=portal.notes,
        structure_cloned_from=(
            clone_result.source_tenant_id if clone_result is not None else None
        ),
        catalog_version=(
            clone_result.catalog_version if clone_result is not None else None
        ),
    )


@router.post("/", response_model=PortalResponse, status_code=status.HTTP_201_CREATED)
def create_portal(
    data: PortalCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    try:
        portal, clone_result = service.create_portal(db, data)
    except SourceTenantNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TargetTenantNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SourceTenantHasNoStructureError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except TargetTenantAlreadyHasStructureError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return _portal_response(portal, clone_result)


@router.get("/", response_model=list[PortalResponse])
def list_portals(
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    portals = service.get_portals(db)
    return [_portal_response(portal) for portal in portals]


@router.get("/{portal_id}/environment", response_model=TenantEnvironmentRead)
def get_portal_environment(
    portal_id: int,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    portal = service.get_portal(db, portal_id)
    if portal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тенант (portal) не найден",
        )
    return TenantEnvironmentRead(**build_tenant_environment_read(portal))


@router.get("/{portal_id}", response_model=PortalResponse)
def get_portal(
    portal_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    portal = service.get_portal(db, portal_id)

    if portal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тенант (portal) не найден",
        )

    return _portal_response(portal)


@router.post(
    "/{portal_id}/clone-structure",
    response_model=CloneTenantStructureResponse,
    status_code=status.HTTP_201_CREATED,
)
def clone_portal_structure(
    portal_id: int,
    data: CloneTenantStructureRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    portal = service.get_portal(db, portal_id)
    if portal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тенант (portal) не найден",
        )

    try:
        result = clone_tenant_structure(db, data.source_tenant_id, portal_id)
    except SourceTenantNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TargetTenantNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SourceTenantHasNoStructureError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except TargetTenantAlreadyHasStructureError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return CloneTenantStructureResponse(
        source_tenant_id=result.source_tenant_id,
        target_tenant_id=result.target_tenant_id,
        pages_cloned=result.pages_cloned,
        navigation_items_cloned=result.navigation_items_cloned,
        object_types_cloned=result.object_types_cloned,
        workspaces_cloned=result.workspaces_cloned,
        catalog_version=result.catalog_version,
    )


@router.delete("/{portal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_portal(
    portal_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    try:
        service.delete_portal(db, portal_id)
    except SystemTenantDeleteForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except TenantNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return None
