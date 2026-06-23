"""Principal type implementations."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from app.modules.control_plane.platform_identity.principal.constants import (
    PRINCIPAL_TYPE_PLATFORM,
    PRINCIPAL_TYPE_SYSTEM,
    PRINCIPAL_TYPE_TENANT,
)
from app.modules.control_plane.platform_identity.principal.contract import contract_dict


@dataclass(frozen=True, slots=True)
class PlatformPrincipal:
    """Platform-layer principal backed by Platform Identity Store."""

    platform_identity_id: uuid.UUID
    platform_role: str
    email: str
    display_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None

    @property
    def principal_type(self) -> str:
        return PRINCIPAL_TYPE_PLATFORM

    @property
    def tenant_id(self) -> int | None:
        return None

    @property
    def role_key(self) -> str | None:
        return None

    def to_contract_dict(self) -> dict[str, Any]:
        return contract_dict(
            principal_type=self.principal_type,
            platform_identity_id=self.platform_identity_id,
            tenant_id=None,
            role_key=None,
            platform_role=self.platform_role,
            extra={
                "email": self.email,
                "display_name": self.display_name,
                "phone": self.phone,
                "avatar_url": self.avatar_url,
            },
        )


@dataclass(frozen=True, slots=True)
class TenantPrincipal:
    """Tenant-scoped principal (legacy users + memberships until full migration)."""

    user_id: int
    tenant_id: int | None
    role_key: str | None

    @property
    def principal_type(self) -> str:
        return PRINCIPAL_TYPE_TENANT

    @property
    def platform_identity_id(self) -> uuid.UUID | None:
        return None

    @property
    def platform_role(self) -> str | None:
        return None

    def to_contract_dict(self) -> dict[str, Any]:
        return contract_dict(
            principal_type=self.principal_type,
            platform_identity_id=None,
            tenant_id=self.tenant_id,
            role_key=self.role_key,
            platform_role=None,
            extra={"user_id": self.user_id},
        )


@dataclass(frozen=True, slots=True)
class SystemPrincipal:
    """Internal/system actor principal (jobs, bootstrap, automation)."""

    system_actor: str

    @property
    def principal_type(self) -> str:
        return PRINCIPAL_TYPE_SYSTEM

    @property
    def platform_identity_id(self) -> uuid.UUID | None:
        return None

    @property
    def tenant_id(self) -> int | None:
        return None

    @property
    def role_key(self) -> str | None:
        return None

    @property
    def platform_role(self) -> str | None:
        return None

    def to_contract_dict(self) -> dict[str, Any]:
        return contract_dict(
            principal_type=self.principal_type,
            platform_identity_id=None,
            tenant_id=None,
            role_key=None,
            platform_role=None,
            extra={"system_actor": self.system_actor},
        )


from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)

Principal = PlatformPrincipal | TenantPrincipal | SystemPrincipal | BridgePrincipal
