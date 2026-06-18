from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GlobalUserCompanyMembershipRead(BaseModel):
    tenant_id: int
    tenant_name: str
    tenant_code: str | None = None
    role_key: str
    membership_status: str
    is_active: bool


class GlobalUserListItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str | None = None
    display_name: str
    avatar_url: str | None = None
    avatar_settings: dict | None = None
    is_active: bool
    global_status: str
    created_at: datetime | None = None
    last_login_at: datetime | None = None
    companies_count: int = 0


class GlobalUserRead(GlobalUserListItemRead):
    companies: list[GlobalUserCompanyMembershipRead] = Field(default_factory=list)


class GlobalUserStatusUpdate(BaseModel):
    is_active: bool


class GlobalUserActionResponse(BaseModel):
    status: str
    message: str
    email: str | None = None
