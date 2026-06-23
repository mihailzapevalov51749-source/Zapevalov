"""BridgePrincipal — Session Bridge scoped principal."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from app.modules.control_plane.platform_identity.infrastructure_superadmin import (
    is_infrastructure_superadmin,
)
from app.modules.control_plane.platform_identity.session_bridge.contract import BridgeClaims

PRINCIPAL_TYPE_BRIDGE = "bridge"


@dataclass(frozen=True, slots=True)
class BridgePrincipal:
    """Platform principal bridged into a tenant environment (no tenant user identity)."""

    platform_identity_id: uuid.UUID
    platform_role: str
    portal_id: int
    database_name: str
    tenant_code: str
    ticket_id: uuid.UUID
    environment_key: str | None = None
    owner_email: str | None = None
    owner_display_name: str | None = None
    owner_phone: str | None = None
    owner_avatar_url: str | None = None

    @property
    def principal_type(self) -> str:
        return PRINCIPAL_TYPE_BRIDGE

    @property
    def tenant_id(self) -> int | None:
        return self.portal_id

    @property
    def is_infrastructure_superadmin(self) -> bool:
        return is_infrastructure_superadmin(
            platform_role=self.platform_role,
            environment_key=self.environment_key,
            portal_id=self.portal_id,
            database_name=self.database_name,
        )

    @property
    def role_key(self) -> str | None:
        if self.is_infrastructure_superadmin:
            return "superadmin"
        return None

    def to_contract_dict(self) -> dict[str, Any]:
        return {
            "principal_type": self.principal_type,
            "platform_identity_id": str(self.platform_identity_id),
            "tenant_id": self.portal_id,
            "role_key": self.role_key,
            "platform_role": self.platform_role,
            "portal_id": self.portal_id,
            "database_name": self.database_name,
            "tenant_code": self.tenant_code,
            "ticket_id": str(self.ticket_id),
            "environment_key": self.environment_key,
            "is_infrastructure_superadmin": self.is_infrastructure_superadmin,
            "owner_email": self.owner_email,
            "owner_display_name": self.owner_display_name,
            "owner_phone": self.owner_phone,
            "owner_avatar_url": self.owner_avatar_url,
        }


def build_bridge_principal(claims: BridgeClaims) -> BridgePrincipal:
    """Build BridgePrincipal from validated ticket claims."""
    return BridgePrincipal(
        platform_identity_id=claims.platform_identity_id,
        platform_role=claims.platform_role,
        portal_id=claims.portal_id,
        database_name=claims.database_name,
        tenant_code=claims.tenant_code,
        ticket_id=claims.ticket_id,
        environment_key=claims.environment_key,
        owner_email=claims.owner_email,
        owner_display_name=claims.owner_display_name,
        owner_phone=claims.owner_phone,
        owner_avatar_url=claims.owner_avatar_url,
    )
