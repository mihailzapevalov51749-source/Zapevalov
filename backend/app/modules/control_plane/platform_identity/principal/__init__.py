"""Principal Layer (ADR-009 Phase 3)."""

from app.modules.control_plane.platform_identity.principal.audit import (
    principal_audit,
    principal_debug,
    who_am_i,
)
from app.modules.control_plane.platform_identity.principal.constants import (
    PRINCIPAL_TYPE_BRIDGE,
    PRINCIPAL_TYPE_PLATFORM,
    PRINCIPAL_TYPE_SYSTEM,
    PRINCIPAL_TYPE_TENANT,
)
from app.modules.control_plane.platform_identity.principal.contract import PrincipalContract
from app.modules.control_plane.platform_identity.principal.factory import (
    PrincipalFactory,
    build_principal_from_user,
    build_system_principal,
)
from app.modules.control_plane.platform_identity.principal.resolver import (
    get_current_principal,
    resolve_principal_from_user,
)
from app.modules.control_plane.platform_identity.principal.types import (
    BridgePrincipal,
    PlatformPrincipal,
    Principal,
    SystemPrincipal,
    TenantPrincipal,
)

__all__ = [
    "PRINCIPAL_TYPE_BRIDGE",
    "PRINCIPAL_TYPE_PLATFORM",
    "PRINCIPAL_TYPE_SYSTEM",
    "PRINCIPAL_TYPE_TENANT",
    "BridgePrincipal",
    "PlatformPrincipal",
    "Principal",
    "PrincipalContract",
    "PrincipalFactory",
    "SystemPrincipal",
    "TenantPrincipal",
    "build_principal_from_user",
    "build_system_principal",
    "get_current_principal",
    "principal_audit",
    "principal_debug",
    "resolve_principal_from_user",
    "who_am_i",
]
