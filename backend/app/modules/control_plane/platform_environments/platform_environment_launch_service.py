"""Environment Launch for infrastructure slots (TEMPLATE only, WI-17)."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.environment_guard import ENVIRONMENT_MATRIX
from app.modules.company_database_provisioning.database_urls import build_database_url
from app.modules.control_plane.customer_companies.catalog_launch import (
    build_company_open_path,
    resolve_api_base_url,
    resolve_frontend_base_url,
)
from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap.minimal_runtime_shell import resolve_tenant_home_page_id

TEMPLATE_ENVIRONMENT_KEY = "TEMPLATE"


class PlatformEnvironmentLaunchError(Exception):
    """Base error for environment launch resolution."""


class PlatformEnvironmentLaunchForbidden(PlatformEnvironmentLaunchError):
    """Launch is not allowed for the requested environment slot."""


class PlatformEnvironmentLaunchNotFound(PlatformEnvironmentLaunchError):
    """Environment slot or runtime portal metadata is missing."""


@dataclass(frozen=True, slots=True)
class EnvironmentLaunchContext:
    environment_key: str
    portal_id: int
    database_name: str
    tenant_code: str
    frontend_base_url: str
    api_base_url: str
    home_page_id: int
    redirect_path: str


def resolve_environment_key_for_portal(portal_id: int) -> str | None:
    for environment_key, expectation in ENVIRONMENT_MATRIX.items():
        if int(expectation.portal_id) == int(portal_id):
            return environment_key
    return None


def _open_environment_runtime_session(database_name: str) -> tuple[object, Session]:
    engine = create_engine(build_database_url(database_name))
    session = sessionmaker(bind=engine)()
    return engine, session


def _resolve_tenant_code(runtime_db: Session, portal_id: int) -> str:
    portal = runtime_db.get(Portal, portal_id)
    if portal is None:
        raise PlatformEnvironmentLaunchNotFound(
            f"Portal id={portal_id} not found in environment runtime database",
        )
    tenant_code = str(portal.code or "").strip()
    if not tenant_code:
        raise PlatformEnvironmentLaunchNotFound(
            f"Portal id={portal_id} has no technical tenant code in runtime database",
        )
    return tenant_code


def _resolve_home_page_id(runtime_db: Session, portal_id: int) -> int:
    home_page_id = resolve_tenant_home_page_id(runtime_db, portal_id)
    if home_page_id is None:
        raise PlatformEnvironmentLaunchNotFound(
            f"Home page not found for portal id={portal_id} in environment runtime database",
        )
    return int(home_page_id)


def build_template_environment_launch_context(*, portal_id: int) -> EnvironmentLaunchContext:
    """Resolve launch metadata for the TEMPLATE infrastructure slot only."""
    environment_key = resolve_environment_key_for_portal(portal_id)
    if environment_key != TEMPLATE_ENVIRONMENT_KEY:
        raise PlatformEnvironmentLaunchForbidden(
            f"Environment launch is allowed only for {TEMPLATE_ENVIRONMENT_KEY}, got {environment_key!r}",
        )

    expectation = ENVIRONMENT_MATRIX[TEMPLATE_ENVIRONMENT_KEY]
    if int(portal_id) != int(expectation.portal_id):
        raise PlatformEnvironmentLaunchForbidden(
            f"Portal id={portal_id} does not match TEMPLATE environment slot",
        )

    database_name = str(expectation.database)
    frontend_base_url = resolve_frontend_base_url(database_name=database_name)
    api_base_url = resolve_api_base_url(database_name=database_name)
    if not frontend_base_url:
        raise PlatformEnvironmentLaunchNotFound(
            f"Frontend base URL is not configured for database {database_name}",
        )

    engine, runtime_db = _open_environment_runtime_session(database_name)
    try:
        tenant_code = _resolve_tenant_code(runtime_db, portal_id)
        home_page_id = _resolve_home_page_id(runtime_db, portal_id)
    finally:
        runtime_db.close()
        engine.dispose()

    redirect_path = build_company_open_path(portal_id=portal_id, home_page_id=home_page_id)
    if redirect_path is None:
        raise PlatformEnvironmentLaunchNotFound(
            f"Redirect path could not be built for portal id={portal_id}",
        )

    return EnvironmentLaunchContext(
        environment_key=environment_key,
        portal_id=int(portal_id),
        database_name=database_name,
        tenant_code=tenant_code,
        frontend_base_url=frontend_base_url,
        api_base_url=str(api_base_url or ""),
        home_page_id=home_page_id,
        redirect_path=redirect_path,
    )
