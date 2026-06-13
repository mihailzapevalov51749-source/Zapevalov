from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.portals.schemas import CompanySuperadminRead


class CompanyTenantUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    full_name: str | None = None
    email: str
    phone: str | None = None
    role: str
    role_label: str
    is_active: bool
    is_company_owner: bool


class CompanyTenantUsersResponse(BaseModel):
    items: list[CompanyTenantUserRead]


class ChangeCompanyAdministratorRequest(BaseModel):
    user_id: int = Field(..., ge=1)


class InviteCompanyAdministratorRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=64)
    position: str | None = Field(default=None, max_length=255)


class CompanyAdministratorActionResponse(BaseModel):
    company_superadmin: CompanySuperadminRead
    invitation_sent: bool = False
