from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RelationInstanceCreate(BaseModel):
    source_entity_id: UUID
    target_entity_id: UUID


class RelationInstanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    relation_key: str
    relation_id: UUID | None
    catalog_version: int
    source_entity_id: UUID
    target_entity_id: UUID
    source_object_type_key: str
    target_object_type_key: str
    status: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


class RelationInstanceListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    relation_key: str
    relation_id: UUID | None
    catalog_version: int
    source_entity_id: UUID
    target_entity_id: UUID
    source_object_type_key: str
    target_object_type_key: str
    status: str
    created_at: datetime
    updated_at: datetime
