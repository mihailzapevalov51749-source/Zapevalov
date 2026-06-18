from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.portals import repository
from app.modules.portals.general_settings import serialize_portal_general_settings
from app.modules.portals.public_slug_service import (
    PublicSlugConflictError,
    assert_public_slug_available,
    resolve_portal_public_slug_for_update,
)
from app.modules.portals.public_tenant_url import resolve_company_portal_url
from app.modules.portals.schemas import PortalCreate, PortalGeneralSettingsUpdate
from app.modules.tenant_bootstrap import clone_tenant_structure
from app.modules.tenant_bootstrap.clone_tenant_structure import CloneTenantStructureResult
from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    TenantStatus,
    TenantType,
)
from app.modules.tenant_environment.resolver import resolve_bootstrap_source_tenant_id
from app.modules.tenant_management.delete_tenant import DeleteTenantResult, delete_tenant


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
    source_tenant_id = resolve_bootstrap_source_tenant_id(db, data.bootstrap_from_tenant_id)
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
    else:
        from app.modules.tenant_bootstrap.runtime_module_provisioning import (
            provision_tenant_runtime_modules,
        )

        provision_tenant_runtime_modules(
            db, portal.id, commit=False, bypass_module_config_write_policy=True
        )

    from app.modules.tenant_bootstrap.minimal_runtime_shell import (
        ensure_tenant_home_runtime_shell,
    )

    ensure_tenant_home_runtime_shell(
        db,
        portal_id=portal.id,
        title=data.name,
        commit=True,
    )

    return portal, clone_result


def get_portals(db: Session):
    return repository.get_portals(db)


def get_portal(db: Session, portal_id: int):
    return repository.get_portal(db, portal_id)


def update_portal_general_settings(
    db: Session,
    portal_id: int,
    payload: PortalGeneralSettingsUpdate,
):
    portal = repository.get_portal(db, portal_id)
    if portal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тенант (portal) не найден",
        )

    normalized_short_name = str(payload.short_name or "").strip() or None

    try:
        resolved_slug, slug_locked = resolve_portal_public_slug_for_update(
            portal,
            short_name=normalized_short_name,
            company_name=payload.name.strip(),
            requested_public_slug=payload.public_slug,
            requested_public_slug_locked=payload.public_slug_locked,
        )
        public_slug = assert_public_slug_available(
            db,
            resolved_slug,
            exclude_portal_id=portal_id,
        )
    except PublicSlugConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return repository.update_portal_general_settings(
        db,
        portal,
        name=payload.name.strip(),
        short_name=normalized_short_name,
        public_slug=public_slug,
        public_slug_locked=slug_locked,
        description=str(payload.description or "").strip() or None,
        timezone=payload.timezone,
        date_format=payload.date_format,
        time_format=payload.time_format,
        week_start_day=payload.week_start_day,
        default_language=payload.default_language,
    )


def delete_portal(db: Session, portal_id: int) -> DeleteTenantResult:
    return delete_tenant(db, portal_id)
