"""Resolve launch URLs for customer company catalog entries."""

from __future__ import annotations

from app.core.environment_guard import ENVIRONMENT_MATRIX
from app.modules.company_database_provisioning.naming import is_company_runtime_database
from app.modules.control_plane.platform_environments.constants import (
    PLATFORM_ENVIRONMENT_LAUNCH_PORTS,
)

_DATABASE_TO_ENVIRONMENT_KEY: dict[str, str] = {
    expectation.database: environment_key
    for environment_key, expectation in ENVIRONMENT_MATRIX.items()
}


def _resolve_environment_key(database_name: str) -> str | None:
    normalized = str(database_name or "").strip()
    if is_company_runtime_database(normalized):
        return "CLIENT"
    return _DATABASE_TO_ENVIRONMENT_KEY.get(normalized)


def resolve_frontend_base_url(
    *,
    database_name: str,
    stored_frontend_base_url: str | None = None,
) -> str | None:
    stored = str(stored_frontend_base_url or "").strip().rstrip("/")
    if stored:
        return stored

    environment_key = _resolve_environment_key(str(database_name or "").strip())
    if environment_key is None:
        return None

    frontend_port = PLATFORM_ENVIRONMENT_LAUNCH_PORTS.get(environment_key, {}).get("frontend_port")
    if frontend_port is None:
        return None

    return f"http://localhost:{int(frontend_port)}"


def resolve_api_base_url(
    *,
    database_name: str,
    stored_api_base_url: str | None = None,
) -> str | None:
    stored = str(stored_api_base_url or "").strip().rstrip("/")
    if stored:
        return stored

    environment_key = _resolve_environment_key(str(database_name or "").strip())
    if environment_key is None:
        return None

    backend_port = PLATFORM_ENVIRONMENT_LAUNCH_PORTS.get(environment_key, {}).get("backend_port")
    if backend_port is None:
        return None

    return f"http://localhost:{int(backend_port)}"


def build_company_open_path(*, portal_id: int, home_page_id: int | None) -> str | None:
    if portal_id <= 0 or home_page_id is None or int(home_page_id) <= 0:
        return None
    return f"/portal/{int(portal_id)}/page/{int(home_page_id)}"


def build_company_open_url(
    *,
    frontend_base_url: str | None,
    portal_id: int,
    home_page_id: int | None,
) -> str | None:
    base = str(frontend_base_url or "").strip().rstrip("/")
    path = build_company_open_path(portal_id=portal_id, home_page_id=home_page_id)
    if not base or path is None:
        return None
    return f"{base}{path}"
