"""Synthetic runtime actor for infrastructure bridge sessions (no tenant user row)."""

from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace

from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)


@dataclass(slots=True)
class InfrastructureBridgeDesignerActor:
    """Platform Owner bridge session in DEV/TEMPLATE — designer/admin APIs without tenant user."""

    bridge_principal: BridgePrincipal
    id: int | None = None
    is_active: bool = True
    is_platform_owner: bool = True
    is_infrastructure_superadmin: bool = True
    tenant_id: int | None = None
    role: SimpleNamespace | None = None

    def __post_init__(self) -> None:
        if self.tenant_id is None:
            self.tenant_id = self.bridge_principal.portal_id
        if self.role is None:
            self.role = SimpleNamespace(name="superadmin")


def build_infrastructure_bridge_designer_actor(
    principal: BridgePrincipal,
) -> InfrastructureBridgeDesignerActor:
    return InfrastructureBridgeDesignerActor(bridge_principal=principal)
