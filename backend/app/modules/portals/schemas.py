from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

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


class PortalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
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
