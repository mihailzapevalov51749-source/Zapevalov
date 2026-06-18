from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.modules.tenant_bootstrap.constants import DEFAULT_BOOTSTRAP_FROM_TENANT_ID
from app.modules.control_plane.platform_profile.constants import (
    PLATFORM_TIMEZONE_OPTIONS,
    PLATFORM_WEEK_START_OPTIONS,
)
from app.modules.control_plane.platform_profile.schemas import (
    _normalize_date_format,
    _normalize_language,
    _normalize_time_format,
)


from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    TenantStatus,
    TenantType,
)


class PortalGeneralSettingsUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    short_name: str | None = Field(default=None, max_length=64)
    public_slug: str = Field(min_length=1, max_length=64)
    public_slug_locked: bool = False
    description: str | None = Field(default=None, max_length=5000)
    timezone: str = Field(min_length=1, max_length=128)
    date_format: str = Field(min_length=1, max_length=32)
    time_format: str = Field(min_length=1, max_length=64)
    week_start_day: str = Field(min_length=1, max_length=32)
    default_language: str = Field(min_length=2, max_length=32)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if normalized not in PLATFORM_TIMEZONE_OPTIONS:
            raise ValueError("Недопустимый часовой пояс")
        return normalized

    @field_validator("date_format")
    @classmethod
    def validate_date_format(cls, value: str) -> str:
        return _normalize_date_format(value)

    @field_validator("time_format")
    @classmethod
    def validate_time_format(cls, value: str) -> str:
        return _normalize_time_format(value)

    @field_validator("week_start_day")
    @classmethod
    def validate_week_start_day(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if normalized not in PLATFORM_WEEK_START_OPTIONS:
            raise ValueError("Недопустимый первый день недели")
        return normalized

    @field_validator("default_language")
    @classmethod
    def validate_default_language(cls, value: str) -> str:
        return _normalize_language(value)


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
        default=None,
        description=(
            "Clone structure from this tenant after create; "
            "null resolves Platform Template in the current database"
        ),
    )
    first_admin: CompanyFirstAdminCreate


class PortalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    original_name: str
    code: str | None = None
    short_name: str | None = None
    public_slug: str | None = None
    public_slug_locked: bool = False
    public_url: str | None = None
    description: str | None = None
    is_active: bool = True
    is_protected: bool = False
    environment_role: str | None = None
    created_at: datetime | None = None
    tenant_type: TenantType
    platform_version: str = ""
    template_version: str = DEFAULT_TEMPLATE_VERSION
    tenant_status: TenantStatus = TenantStatus.ACTIVE
    source_tenant_id: int | None = None
    notes: str | None = None
    timezone: str = "(UTC+03:00) Москва"
    date_format: str = "DD.MM.YYYY"
    time_format: str = "24 часа (14:30)"
    week_start_day: str = "Понедельник"
    default_language: str = "Русский"
    structure_cloned_from: int | None = None
    catalog_version: int | None = None
    company_superadmin: CompanySuperadminRead | None = None


class PortalWithSuperadminResponse(PortalResponse):
    company_superadmin: CompanySuperadminRead | None = None
    customer_company_id: int | None = None
    invitation_sent: bool = False
