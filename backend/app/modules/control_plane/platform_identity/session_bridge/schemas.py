"""Session Bridge runtime API schemas (WI-07)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class BridgeTicketMintResponse(BaseModel):
    bridge_ticket: str
    ticket_id: str
    portal_id: int
    database_name: str
    tenant_code: str
    expires_at: int


class BridgeExchangeRequest(BaseModel):
    bridge_ticket: str = Field(..., min_length=1)


class BridgeExchangeResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    principal_type: str = "bridge"
    platform_identity_id: str
    platform_role: str
    portal_id: int
    database_name: str
    tenant_code: str
    environment_key: str | None = None
    is_infrastructure_superadmin: bool = False
    is_platform_owner: bool = False
    effective_role: str | None = None
    display_name: str | None = None
    email: str | None = None


class BridgeMeResponse(BaseModel):
    principal_type: str
    platform_identity_id: str
    platform_role: str
    portal_id: int
    database_name: str
    tenant_code: str
    ticket_id: str
    environment_key: str | None = None
    is_infrastructure_superadmin: bool = False
    is_platform_owner: bool = False
    effective_role: str | None = None
    display_name: str | None = None
    email: str | None = None
