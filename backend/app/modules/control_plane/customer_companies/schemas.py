from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.control_plane.customer_companies.constants import (
    CustomerCompanyStatus,
    DEFAULT_CUSTOMER_COMPANY_USERS_LIMIT,
)
from app.modules.tenant_environment.constants import TenantStatus, TenantType


class CustomerCompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    status: CustomerCompanyStatus = CustomerCompanyStatus.ACTIVE
    primary_portal_id: int | None = Field(default=None, ge=1)
    users_limit: int = Field(default=DEFAULT_CUSTOMER_COMPANY_USERS_LIMIT, ge=1, le=100_000)
    sales_owner_id: int | None = Field(default=None, ge=1)
    support_owner_id: int | None = Field(default=None, ge=1)


class CustomerCompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    status: CustomerCompanyStatus | None = None
    primary_portal_id: int | None = Field(default=None, ge=1)
    users_limit: int | None = Field(default=None, ge=1, le=100_000)
    sales_owner_id: int | None = Field(default=None, ge=1)
    support_owner_id: int | None = Field(default=None, ge=1)

    @field_validator("primary_portal_id", "sales_owner_id", "support_owner_id", mode="before")
    @classmethod
    def normalize_nullable_ids(cls, value):
        if value == 0:
            return None
        return value


class CustomerCompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: CustomerCompanyStatus
    primary_portal_id: int | None = None
    portal_id: int | None = None
    database_name: str | None = None
    code: str | None = None
    tenant_type: str | None = None
    environment_role: str | None = None
    tenant_status: str | None = None
    original_name: str | None = None
    short_name: str | None = None
    public_slug: str | None = None
    template_version: str | None = None
    platform_version: str | None = None
    users_limit: int
    sales_owner_id: int | None = None
    support_owner_id: int | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value):
        if isinstance(value, CustomerCompanyStatus):
            return value
        return CustomerCompanyStatus(str(value))


class CustomerCompanyCatalogListItem(BaseModel):
    """UI-compatible list item: id is portal_id (tenant id)."""

    id: int
    catalog_id: int
    portal_id: int
    original_name: str
    name: str
    short_name: str | None = None
    code: str | None = None
    tenant_type: TenantType
    platform_version: str
    template_version: str
    tenant_status: TenantStatus
    environment_role: str | None = None
    database_name: str
    public_slug: str | None = None
    company_status: CustomerCompanyStatus
    home_page_id: int | None = None
    frontend_base_url: str | None = None
    api_base_url: str | None = None
    open_url: str | None = None
    created_at: datetime


class CustomerCompanyCatalogDetail(CustomerCompanyCatalogListItem):
    description: str | None = None
    users_limit: int
    source_tenant_id: int | None = None
    notes: str | None = None
