"""Session Bridge foundation (WI-06) — stateless ticket mint/validate."""

from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
    build_bridge_principal,
)
from app.modules.control_plane.platform_identity.session_bridge.contract import (
    BridgeClaims,
    BridgeTicket,
    BridgeValidationResult,
)
from app.modules.control_plane.platform_identity.session_bridge.issuer import (
    mint_bridge_ticket,
)
from app.modules.control_plane.platform_identity.session_bridge.trust import (
    bridge_trust_contract,
)
from app.modules.control_plane.platform_identity.session_bridge.validator import (
    validate_bridge_ticket,
)

__all__ = [
    "BridgeClaims",
    "BridgePrincipal",
    "BridgeTicket",
    "BridgeValidationResult",
    "bridge_trust_contract",
    "build_bridge_principal",
    "mint_bridge_ticket",
    "validate_bridge_ticket",
]
