"""Principal layer constants (technical keys only)."""

from __future__ import annotations

PRINCIPAL_TYPE_PLATFORM = "platform"
PRINCIPAL_TYPE_TENANT = "tenant"
PRINCIPAL_TYPE_SYSTEM = "system"
PRINCIPAL_TYPE_BRIDGE = "bridge"

PRINCIPAL_TYPES = frozenset(
    {
        PRINCIPAL_TYPE_PLATFORM,
        PRINCIPAL_TYPE_TENANT,
        PRINCIPAL_TYPE_SYSTEM,
        PRINCIPAL_TYPE_BRIDGE,
    }
)

PLATFORM_ROLE_PRIORITY = {
    "platform_owner": 0,
    "platform_admin": 1,
    "platform_operator": 2,
    "platform_support": 3,
}
