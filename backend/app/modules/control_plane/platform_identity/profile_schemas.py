"""Platform Identity profile API schemas (single owner profile SoT)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PlatformIdentityProfileRead(BaseModel):
    profile_source: str = Field(default="platform_identity_store")
    platform_identity_id: str
    full_name: str | None = None
    email: str
    phone: str | None = None
    avatar_url: str | None = None
    avatar_settings: dict | None = None
    status: str
    is_active: bool = True
    legacy_user_id: int | None = None
