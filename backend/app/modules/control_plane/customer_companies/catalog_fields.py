"""Catalog metadata helpers for customer_companies platform registry."""

from __future__ import annotations

import os
from urllib.parse import urlparse, unquote

from app.core.environment_guard import ENVIRONMENT_MATRIX
from app.modules.company_database_provisioning.naming import (
    build_company_database_name,
    is_company_runtime_database,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import (
    PROVISIONING_TENANT_TYPES,
    TenantStatus,
    TenantType,
)

CLIENT_RUNTIME_DATABASE = ENVIRONMENT_MATRIX["CLIENT"].database
DEV_RUNTIME_DATABASE = ENVIRONMENT_MATRIX["DEV"].database
TEMPLATE_RUNTIME_DATABASE = ENVIRONMENT_MATRIX["TEMPLATE"].database
DEV_FRONTEND_PORT = 5173


def extract_database_name(database_url: str) -> str:
    parsed = urlparse(database_url.strip())
    path = (parsed.path or "").lstrip("/")
    if not path:
        raise ValueError("DATABASE_URL does not contain a database name")
    return unquote(path.split("?", 1)[0])


def resolve_current_database_name() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    return extract_database_name(database_url)


def resolve_catalog_runtime_database_name(
    *,
    tenant_type: str,
    environment_role: str | None = None,
    company_code: str | None = None,
) -> str:
    """Map tenant catalog metadata to isolated runtime database (not Control Plane registry DB)."""
    if company_code:
        return build_company_database_name(company_code)

    normalized_type = str(tenant_type or TenantType.CLIENT.value).strip().upper()
    if normalized_type == TenantType.DEV.value:
        return DEV_RUNTIME_DATABASE
    if normalized_type == TenantType.TEMPLATE.value:
        return TEMPLATE_RUNTIME_DATABASE
    if normalized_type in {member.value for member in PROVISIONING_TENANT_TYPES}:
        return CLIENT_RUNTIME_DATABASE
    if normalized_type == TenantType.CLIENT.value:
        return CLIENT_RUNTIME_DATABASE
    return CLIENT_RUNTIME_DATABASE


def is_client_dev_database_misconfiguration(
    *,
    tenant_type: str,
    database_name: str,
) -> bool:
    normalized_type = str(tenant_type or "").strip().upper()
    normalized_db = str(database_name or "").strip()
    if is_company_runtime_database(normalized_db):
        return False
    return (
        normalized_type == TenantType.CLIENT.value
        and normalized_db == DEV_RUNTIME_DATABASE
    )


def is_control_plane_frontend_url(frontend_base_url: str | None) -> bool:
    stored = str(frontend_base_url or "").strip().rstrip("/")
    if not stored:
        return False
    return stored.endswith(f":{DEV_FRONTEND_PORT}")


def apply_portal_catalog_metadata(
    company,
    *,
    portal: Portal,
    database_name: str,
    platform_version: str | None = None,
    home_page_id: int | None = None,
) -> None:
    company.portal_id = portal.id
    company.database_name = database_name
    company.code = portal.code
    company.tenant_type = str(portal.tenant_type or TenantType.CLIENT.value)
    company.environment_role = portal.environment_role
    company.tenant_status = str(portal.tenant_status or TenantStatus.ACTIVE.value)
    company.original_name = str(portal.original_name or portal.name)
    company.short_name = portal.short_name
    company.public_slug = portal.public_slug
    company.template_version = str(portal.template_version or "")
    if platform_version:
        company.platform_version = platform_version
    if home_page_id is not None:
        company.home_page_id = home_page_id


def apply_catalog_metadata(
    company,
    *,
    portal_id: int,
    database_name: str,
    code: str | None,
    tenant_type: str,
    environment_role: str | None,
    tenant_status: str,
    original_name: str | None,
    name: str,
    short_name: str | None = None,
    public_slug: str | None = None,
    template_version: str | None = None,
    platform_version: str | None = None,
    home_page_id: int | None = None,
    frontend_base_url: str | None = None,
    api_base_url: str | None = None,
) -> None:
    company.portal_id = portal_id
    company.database_name = database_name
    company.code = code
    company.tenant_type = tenant_type
    company.environment_role = environment_role
    company.tenant_status = tenant_status
    company.original_name = original_name or name
    company.name = name
    company.short_name = short_name
    company.public_slug = public_slug
    company.template_version = template_version
    company.platform_version = platform_version
    company.home_page_id = home_page_id
    company.frontend_base_url = frontend_base_url
    company.api_base_url = api_base_url
