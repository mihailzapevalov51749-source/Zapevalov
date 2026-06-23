"""Session Bridge contract types (no persistence)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

BridgeValidationStatus = Literal["valid", "expired", "invalid"]


@dataclass(frozen=True, slots=True)
class BridgeClaims:
    """Technical claims carried by a Bridge Ticket."""

    ticket_id: uuid.UUID
    platform_identity_id: uuid.UUID
    platform_role: str
    portal_id: int
    database_name: str
    tenant_code: str
    issued_at: datetime
    expires_at: datetime
    auth_source: str | None = None
    environment_key: str | None = None
    owner_email: str | None = None
    owner_display_name: str | None = None
    owner_phone: str | None = None
    owner_avatar_url: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "ticket_id": str(self.ticket_id),
            "platform_identity_id": str(self.platform_identity_id),
            "platform_role": self.platform_role,
            "portal_id": self.portal_id,
            "database_name": self.database_name,
            "tenant_code": self.tenant_code,
            "issued_at": int(self.issued_at.timestamp()),
            "expires_at": int(self.expires_at.timestamp()),
            "auth_source": self.auth_source,
        }
        if self.environment_key:
            payload["environment_key"] = self.environment_key
        if self.owner_email:
            payload["owner_email"] = self.owner_email
        if self.owner_display_name:
            payload["owner_display_name"] = self.owner_display_name
        if self.owner_phone:
            payload["owner_phone"] = self.owner_phone
        if self.owner_avatar_url:
            payload["owner_avatar_url"] = self.owner_avatar_url
        return payload


@dataclass(frozen=True, slots=True)
class BridgeTicket:
    """Signed stateless Bridge Ticket (JWT envelope)."""

    token: str
    claims: BridgeClaims


@dataclass(frozen=True, slots=True)
class BridgeValidationResult:
    """Result of Bridge Ticket validation."""

    status: BridgeValidationStatus
    claims: BridgeClaims | None = None
    ticket: BridgeTicket | None = None
    error_code: str | None = None
    error_message: str | None = None

    @property
    def is_valid(self) -> bool:
        return self.status == "valid" and self.claims is not None
