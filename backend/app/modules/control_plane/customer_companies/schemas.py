from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.control_plane.customer_companies.constants import (
    CustomerCompanyStatus,
    DEFAULT_CUSTOMER_COMPANY_USERS_LIMIT,
)


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
