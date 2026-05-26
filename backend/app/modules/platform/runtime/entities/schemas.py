from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EntityValuesBody(BaseModel):
    values: dict[str, Any] = Field(default_factory=dict)


class EntityCreate(EntityValuesBody):
    pass


class EntityUpdate(EntityValuesBody):
    pass


class EntityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    object_type_key: str
    object_type_id: UUID | None
    catalog_version: int
    status: str
    values: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
