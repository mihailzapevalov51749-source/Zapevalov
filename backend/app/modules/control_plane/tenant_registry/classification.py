"""Classification helpers for tenant registry vs client companies."""

from __future__ import annotations

from app.modules.tenant_environment.constants import (
    TenantEnvironmentRole,
    TenantType,
)

INFRASTRUCTURE_TENANT_TYPES: frozenset[TenantType] = frozenset({
    TenantType.DEV,
    TenantType.TEMPLATE,
    TenantType.LEGACY_TEMPLATE,
})

INFRASTRUCTURE_ENVIRONMENT_ROLES: frozenset[str] = frozenset({
    TenantEnvironmentRole.DEV.value,
    TenantEnvironmentRole.TEMPLATE.value,
})

CLIENT_COMPANY_TENANT_TYPE = TenantType.CLIENT


def is_infrastructure_tenant_portal(
    *,
    tenant_type: str | None,
    environment_role: str | None,
) -> bool:
    normalized_type = str(tenant_type or "").strip().upper()
    if normalized_type == CLIENT_COMPANY_TENANT_TYPE.value:
        return False

    if normalized_type in {item.value for item in INFRASTRUCTURE_TENANT_TYPES}:
        return True

    normalized_role = str(environment_role or "").strip().upper()
    if normalized_role in INFRASTRUCTURE_ENVIRONMENT_ROLES:
        return True

    return False


def is_client_company_portal(
    *,
    tenant_type: str | None,
    environment_role: str | None,
) -> bool:
    normalized_type = str(tenant_type or "").strip().upper()
    if normalized_type == CLIENT_COMPANY_TENANT_TYPE.value:
        return True
    return False
