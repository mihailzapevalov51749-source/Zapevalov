"""Synthetic runtime actor for infrastructure bridge sessions (no tenant user row)."""

from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace

from app.modules.control_plane.platform_identity.legacy_user_resolution import (
    resolve_legacy_user_id_for_platform_identity,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_actor_ids import (
    resolve_bridge_actor_user_id,
)
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
    email: str | None = None
    full_name: str | None = None

    def __post_init__(self) -> None:
        if self.tenant_id is None:
            self.tenant_id = self.bridge_principal.portal_id
        if self.id is None:
            legacy_user_id = resolve_legacy_user_id_for_platform_identity(
                self.bridge_principal.platform_identity_id,
            )
            self.id = (
                legacy_user_id
                if legacy_user_id is not None
                else resolve_bridge_actor_user_id(
                    self.bridge_principal.platform_identity_id,
                )
            )
        if self.role is None:
            self.role = SimpleNamespace(name="superadmin")
        if self.email is None:
            self.email = self.bridge_principal.owner_email
        if self.full_name is None:
            self.full_name = self.bridge_principal.owner_display_name


def build_infrastructure_bridge_designer_actor(
    principal: BridgePrincipal,
) -> InfrastructureBridgeDesignerActor:
    return InfrastructureBridgeDesignerActor(bridge_principal=principal)
