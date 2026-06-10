"""Tenant environment model — types, resolution, template lookup."""

from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    TenantStatus,
    TenantType,
)
from app.modules.tenant_environment.resolver import (
    build_tenant_environment_read,
    get_template_tenant,
    resolve_portal_tenant_type,
    resolve_template_tenant_id,
    resolve_tenant_type_from_id,
)
from app.modules.tenant_environment.schemas import TenantEnvironmentRead

__all__ = (
    "DEFAULT_TEMPLATE_VERSION",
    "TenantEnvironmentRead",
    "TenantStatus",
    "TenantType",
    "build_tenant_environment_read",
    "get_template_tenant",
    "resolve_portal_tenant_type",
    "resolve_template_tenant_id",
    "resolve_tenant_type_from_id",
)
