"""Platform environments registry — infrastructure slots (not tenant companies)."""

from __future__ import annotations

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.environment_guard import ENVIRONMENT_MATRIX, normalize_app_env, resolve_raw_app_env
from app.modules.control_plane.platform_environments.constants import (
    PLATFORM_ENVIRONMENT_DISPLAY_NAMES,
    PLATFORM_ENVIRONMENT_LAUNCH_PORTS,
    PLATFORM_ENVIRONMENT_ORDER,
)
from app.modules.control_plane.platform_environments.schemas import (
    PlatformEnvironmentDetail,
    PlatformEnvironmentListItem,
)
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_version_registry import crud as version_crud
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus


def _resolve_current_app_env() -> str | None:
    raw = resolve_raw_app_env()
    if raw is None:
        return None
    try:
        return normalize_app_env(raw)
    except Exception:
        return None


def _resolve_status(portal: Portal | None) -> str:
    if portal is None:
        return "—"
    tenant_status = str(portal.tenant_status or TenantStatus.ACTIVE.value).strip().upper()
    if tenant_status == TenantStatus.ACTIVE.value:
        return "Активна"
    if tenant_status == TenantStatus.DISABLED.value:
        return "Отключена"
    if tenant_status == TenantStatus.ARCHIVED.value:
        return "Архив"
    return tenant_status


def _resolve_last_release(
    db: Session,
    *,
    environment_key: str,
    portal_id: int,
) -> str | None:
    deployment = (
        db.query(PlatformDeployment)
        .filter(
            PlatformDeployment.target_environment_type == environment_key,
            PlatformDeployment.target_tenant_id == portal_id,
        )
        .order_by(desc(PlatformDeployment.created_at), desc(PlatformDeployment.id))
        .first()
    )
    if deployment is None:
        deployment = (
            db.query(PlatformDeployment)
            .filter(PlatformDeployment.target_environment_type == environment_key)
            .order_by(desc(PlatformDeployment.created_at), desc(PlatformDeployment.id))
            .first()
        )
    if deployment is None:
        return None

    package = db.get(PlatformReleasePackage, deployment.release_package_id)
    if package is not None and package.package_key:
        return str(package.package_key)
    if deployment.target_platform_version:
        return str(deployment.target_platform_version)
    return None


def _build_environment_item(
    db: Session,
    *,
    environment_key: str,
    current_app_env: str | None,
    portals_by_id: dict[int, Portal],
    versions_by_portal: dict[int, object],
    include_detail: bool,
) -> PlatformEnvironmentListItem | PlatformEnvironmentDetail:
    expectation = ENVIRONMENT_MATRIX[environment_key]
    portal_id = expectation.portal_id
    portal = portals_by_id.get(portal_id)
    launch = PLATFORM_ENVIRONMENT_LAUNCH_PORTS.get(environment_key, {})
    version_row = versions_by_portal.get(portal_id)

    base = {
        "id": portal_id,
        "environment_key": environment_key,
        "name": PLATFORM_ENVIRONMENT_DISPLAY_NAMES.get(environment_key, environment_key),
        "environment_type": environment_key,
        "status": _resolve_status(portal),
        "database_name": expectation.database,
        "backend_port": launch.get("backend_port"),
        "frontend_port": launch.get("frontend_port"),
        "environment_role": expectation.environment_role,
        "is_current_environment": current_app_env == environment_key,
    }

    if not include_detail:
        return PlatformEnvironmentListItem(**base)

    installed_at = getattr(version_row, "installed_at", None) if version_row else None
    current_version = getattr(version_row, "platform_version", None) if version_row else None

    return PlatformEnvironmentDetail(
        **base,
        current_version=str(current_version) if current_version else None,
        installed_at=installed_at,
        last_release=_resolve_last_release(
            db,
            environment_key=environment_key,
            portal_id=portal_id,
        ),
    )


def list_platform_environments(db: Session) -> list[PlatformEnvironmentListItem]:
    current_app_env = _resolve_current_app_env()
    portal_ids = [ENVIRONMENT_MATRIX[key].portal_id for key in PLATFORM_ENVIRONMENT_ORDER]
    portals_by_id = {
        portal.id: portal
        for portal in db.query(Portal).filter(Portal.id.in_(portal_ids)).all()
    }
    versions_by_portal = {
        row.tenant_id: row for row in version_crud.list_current_versions(db)
    }

    return [
        _build_environment_item(
            db,
            environment_key=environment_key,
            current_app_env=current_app_env,
            portals_by_id=portals_by_id,
            versions_by_portal=versions_by_portal,
            include_detail=False,
        )
        for environment_key in PLATFORM_ENVIRONMENT_ORDER
    ]


def get_platform_environment(
    db: Session,
    *,
    portal_id: int,
) -> PlatformEnvironmentDetail | None:
    environment_key = None
    for key, expectation in ENVIRONMENT_MATRIX.items():
        if expectation.portal_id == portal_id:
            environment_key = key
            break
    if environment_key is None:
        return None

    current_app_env = _resolve_current_app_env()
    portal = db.query(Portal).filter(Portal.id == portal_id).one_or_none()
    portals_by_id = {portal_id: portal} if portal is not None else {}
    version_row = version_crud.get_current_version_for_tenant(db, portal_id)
    versions_by_portal = {portal_id: version_row} if version_row is not None else {}

    return _build_environment_item(
        db,
        environment_key=environment_key,
        current_app_env=current_app_env,
        portals_by_id=portals_by_id,
        versions_by_portal=versions_by_portal,
        include_detail=True,
    )
