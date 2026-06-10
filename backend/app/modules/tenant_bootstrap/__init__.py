"""Tenant structure bootstrap — clone reference portal layout into new tenants."""

from app.modules.tenant_bootstrap.clone_tenant_structure import (
    CloneTenantStructureResult,
    clone_tenant_structure,
)
from app.modules.tenant_bootstrap.constants import (
    DEFAULT_BOOTSTRAP_FROM_TENANT_ID,
    PLATFORM_TEMPLATE_TENANT_ID,
)
from app.modules.tenant_bootstrap.exceptions import (
    SourceTenantHasNoStructureError,
    SourceTenantNotFoundError,
    TargetTenantAlreadyHasStructureError,
    TargetTenantNotFoundError,
    TenantBootstrapError,
)

__all__ = [
    "CloneTenantStructureResult",
    "DEFAULT_BOOTSTRAP_FROM_TENANT_ID",
    "PLATFORM_TEMPLATE_TENANT_ID",
    "clone_tenant_structure",
    "SourceTenantHasNoStructureError",
    "SourceTenantNotFoundError",
    "TargetTenantAlreadyHasStructureError",
    "TargetTenantNotFoundError",
    "TenantBootstrapError",
]
