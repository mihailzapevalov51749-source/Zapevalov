"""Tenant structure bootstrap — clone reference portal layout into new tenants."""

from app.modules.tenant_bootstrap.clone_tenant_structure import (
    CloneTenantStructureResult,
    clone_tenant_structure,
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
    "clone_tenant_structure",
    "SourceTenantHasNoStructureError",
    "SourceTenantNotFoundError",
    "TargetTenantAlreadyHasStructureError",
    "TargetTenantNotFoundError",
    "TenantBootstrapError",
]
