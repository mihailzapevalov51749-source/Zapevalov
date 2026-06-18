"""Pydantic schemas for Platform Environments registry."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlatformEnvironmentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Portal id for the environment slot")
    environment_key: str
    name: str
    environment_type: str
    status: str
    database_name: str
    backend_port: int | None = None
    frontend_port: int | None = None
    environment_role: str
    is_current_environment: bool = False


class PlatformEnvironmentDetail(PlatformEnvironmentListItem):
    current_version: str | None = None
    installed_at: datetime | None = None
    last_release: str | None = None


class PlatformEnvironmentBridgeTicketResponse(BaseModel):
    bridge_ticket: str
    ticket_id: str
    portal_id: int
    database_name: str
    tenant_code: str
    environment_key: str
    expires_at: int
    frontend_base_url: str
    redirect_path: str
    home_page_id: int
