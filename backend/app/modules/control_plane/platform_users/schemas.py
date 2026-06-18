from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PlatformRegistryUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str | None = None
    phone: str | None = None
    position: str | None = None
    is_active: bool = True
    is_platform_owner: bool = False
    is_platform_registry_user: bool = True
    platform_role: str
    platform_status: str
    role_id: int | None = None
    role: str | None = None
    tenant_id: int | None = None
    last_login_at: datetime | None = None
    created_at: datetime | None = None
    avatar_url: str | None = None
    avatar_settings: dict | None = None
