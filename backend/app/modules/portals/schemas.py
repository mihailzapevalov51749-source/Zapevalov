from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.tenant_bootstrap.constants import DEFAULT_BOOTSTRAP_FROM_TENANT_ID
from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    TenantStatus,
    TenantType,
)


class PortalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    bootstrap_from_tenant_id: int | None = Field(
        default=DEFAULT_BOOTSTRAP_FROM_TENANT_ID,
        description=(
            "Clone structure from this tenant after create (default: Platform Template); "
            "null skips bootstrap"
        ),
    )


class CompanySuperadminRead(BaseModel):
    user_id: int
    full_name: str | None = None
    email: str
    phone: str | None = None
    position: str | None = None
    is_active: bool = True
    last_login_at: datetime | None = None
    role: str = "superadmin"
    role_label: str = "Суперадминистратор"
    is_owner: bool = True


class CompanyFirstAdminCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=50)
    position: str | None = Field(default=None, max_length=255)


class PortalCreateWithFirstAdmin(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    tenant_type: TenantType = TenantType.CLIENT
    bootstrap_from_tenant_id: int | None = Field(
        default=DEFAULT_BOOTSTRAP_FROM_TENANT_ID,
        description=(
            "Clone structure from this tenant after create (default: Platform Template); "
            "null skips bootstrap"
        ),
    )
    first_admin: CompanyFirstAdminCreate


class PortalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str | None = None
    description: str | None = None
    is_active: bool = True
    created_at: datetime | None = None
    tenant_type: TenantType
    template_version: str = DEFAULT_TEMPLATE_VERSION
    tenant_status: TenantStatus = TenantStatus.ACTIVE
    source_tenant_id: int | None = None
    notes: str | None = None
    structure_cloned_from: int | None = None
    catalog_version: int | None = None
    company_superadmin: CompanySuperadminRead | None = None


class PortalWithSuperadminResponse(PortalResponse):
    company_superadmin: CompanySuperadminRead | None = None
    customer_company_id: int | None = None
    invitation_sent: bool = False
