from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.portals.dependencies import (
    require_portal_profile_manage_access,
    require_portal_profile_read_access,
)
from app.modules.portals.create_with_first_admin import (
    create_portal_with_first_admin,
    get_company_superadmin,
)
from app.modules.tenant_environment.resolver import build_tenant_environment_read
from app.modules.tenant_environment.schemas import TenantEnvironmentRead
from app.modules.tenant_bootstrap import clone_tenant_structure
from app.modules.tenant_bootstrap.exceptions import (
    SourceTenantHasNoStructureError,
    SourceTenantNotFoundError,
    TargetTenantAlreadyHasStructureError,
    TargetTenantNotFoundError,
)
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import PlatformEventJournalSource
from app.modules.platform_event_journal.service import record_platform_event
from app.modules.portals.general_settings import serialize_portal_general_settings
from app.modules.portals.models import Portal
from app.modules.portals.public_tenant_url import resolve_company_portal_url
from app.modules.tenant_management.exceptions import (
    SystemTenantDeleteForbiddenError,
    TenantNotFoundError,
)
from app.modules.tenant_bootstrap.schemas import (
    CloneTenantStructureRequest,
    CloneTenantStructureResponse,
)

from . import service
from app.modules.platform_version_registry.crud import (
    get_current_version_for_tenant,
)
from .schemas import (
    PortalCreate,
    PortalCreateWithFirstAdmin,
    PortalGeneralSettingsUpdate,
    PortalResponse,
    PortalWithSuperadminResponse,
)

router = APIRouter(prefix="/portals", tags=["Portals"])


def _resolve_portal_platform_version(db: Session | None, portal: Portal) -> str:
    if db is not None:
        registry_row = get_current_version_for_tenant(db, portal.id)
        if registry_row is not None and registry_row.platform_version:
            return str(registry_row.platform_version)
    return str(portal.template_version or "")


def _portal_public_url(portal: Portal) -> str | None:
    public_slug = str(getattr(portal, "public_slug", "") or "").strip()
    if not public_slug:
        return None
    return resolve_company_portal_url(public_slug=public_slug)


def _portal_response(portal, clone_result=None, db=None) -> PortalResponse:
    general = serialize_portal_general_settings(portal)
    platform_version = _resolve_portal_platform_version(db, portal)
    return PortalResponse(
        id=portal.id,
        name=portal.name,
        original_name=str(getattr(portal, "original_name", None) or portal.name),
        code=getattr(portal, "code", None),
        short_name=getattr(portal, "short_name", None),
        public_slug=getattr(portal, "public_slug", None),
        public_slug_locked=bool(getattr(portal, "public_slug_locked", False)),
        public_url=_portal_public_url(portal),
        description=portal.description,
        is_active=portal.is_active,
        is_protected=bool(getattr(portal, "is_protected", False)),
        environment_role=getattr(portal, "environment_role", None),
        created_at=portal.created_at,
        tenant_type=portal.tenant_type,
        platform_version=platform_version,
        template_version=portal.template_version,
        tenant_status=portal.tenant_status,
        source_tenant_id=portal.source_tenant_id,
        notes=portal.notes,
        timezone=general["timezone"],
        date_format=general["date_format"],
        time_format=general["time_format"],
        week_start_day=general["week_start_day"],
        default_language=general["default_language"],
        structure_cloned_from=(
            clone_result.source_tenant_id if clone_result is not None else None
        ),
        catalog_version=(
            clone_result.catalog_version if clone_result is not None else None
        ),
        company_superadmin=get_company_superadmin(db, portal.id) if db is not None else None,
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


@router.post(
    "/create-with-first-admin",
    response_model=PortalWithSuperadminResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_portal_with_first_admin_endpoint(
    data: PortalCreateWithFirstAdmin,
    db: Session = Depends(get_db),
    current_user=Depends(require_platform_admin),
):
    try:
        return create_portal_with_first_admin(db, data, current_user=current_user)
    except SourceTenantNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TargetTenantNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SourceTenantHasNoStructureError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except TargetTenantAlreadyHasStructureError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/", response_model=list[PortalResponse])
def list_portals(
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    portals = service.get_portals(db)
    return [_portal_response(portal, db=db) for portal in portals]


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
    _reader=Depends(require_portal_profile_read_access),
):
    portal = service.get_portal(db, portal_id)

    if portal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тенант (portal) не найден",
        )

    return _portal_response(portal, db=db)


@router.patch("/{portal_id}/settings/general", response_model=PortalResponse)
def patch_portal_general_settings(
    portal_id: int,
    payload: PortalGeneralSettingsUpdate,
    db: Session = Depends(get_db),
    _manager=Depends(require_portal_profile_manage_access),
):
    portal = service.update_portal_general_settings(db, portal_id, payload)
    return _portal_response(portal, db=db)


@router.post(
    "/{portal_id}/clone-structure",
    response_model=CloneTenantStructureResponse,
    status_code=status.HTTP_201_CREATED,
)
def clone_portal_structure(
    portal_id: int,
    data: CloneTenantStructureRequest,
    db: Session = Depends(get_db),
    admin=Depends(require_platform_admin),
):
    portal = service.get_portal(db, portal_id)
    if portal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тенант (portal) не найден",
        )

    try:
        result = clone_tenant_structure(
            db,
            data.source_tenant_id,
            portal_id,
            actor_user_id=int(admin.id),
            audit_reason="portal_clone_structure_api",
        )
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
    current_user=Depends(require_platform_admin),
):
    portal = db.query(Portal).filter(Portal.id == portal_id).one_or_none()
    if portal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Компания не найдена")

    portal_name = portal.name
    portal_code = portal.code

    try:
        service.delete_portal(db, portal_id)
    except SystemTenantDeleteForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except TenantNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    record_platform_event(
        db,
        event_code=PlatformEventCode.COMPANY_DELETED.value,
        event_category=PlatformEventCategory.COMPANY.value,
        title=f'Удалена компания «{portal_name}»',
        description=f"Tenant {portal_id} ({portal_code}) полностью удалён из платформы.",
        status=PlatformAuditStatus.DONE.value,
        source=PlatformEventJournalSource.MANUAL.value,
        actor_user=current_user,
        target_type="company",
        target_id=portal_id,
        target_name=portal_name,
        tenant_id=portal_id,
        metadata={"portal_code": portal_code},
        slug=f"company-deleted-{portal_id}-{int(utc_now().timestamp() * 1000)}",
        commit=True,
    )

    return None
