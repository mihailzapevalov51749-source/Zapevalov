"""Tenant module configuration applies package."""

from app.modules.tenant_module_configuration_applies.apply_service import apply_module_configuration_update
from app.modules.tenant_module_configuration_applies.router import (
    platform_applies_router,
    tenant_applies_router,
)

__all__ = [
    "apply_module_configuration_update",
    "platform_applies_router",
    "tenant_applies_router",
]
