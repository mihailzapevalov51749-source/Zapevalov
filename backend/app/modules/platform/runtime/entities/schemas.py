from datetime import datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EntityValuesBody(BaseModel):
    values: dict[str, Any] = Field(default_factory=dict)


class EntityCreate(EntityValuesBody):
    pass


class EntityUpdate(EntityValuesBody):
    pass


class EntityDeleteScenario(str, Enum):
    UNLINK_CHILDREN = "unlink_children"
    WITH_DESCENDANTS = "with_descendants"


class HierarchyLabels(BaseModel):
    parent: str = ""
    child: str = ""
    children: str = ""
    children_genitive: str = ""
    children_instrumental: str = ""


class EntityDeletePreview(BaseModel):
    entity_id: UUID
    entity_title: str = ""
    has_hierarchy_children: bool = False
    descendant_count: int = 0
    hierarchy_relation_key: str = ""
    hierarchy_labels: HierarchyLabels = Field(default_factory=HierarchyLabels)


class EntityDeleteRequest(BaseModel):
    scenario: EntityDeleteScenario | None = None


class EntityDeleteResult(BaseModel):
    entity_id: UUID
    scenario: Literal["solo", "unlink_children", "with_descendants"]
    deleted_entity_ids: list[UUID] = Field(default_factory=list)
    deleted_relation_instance_ids: list[UUID] = Field(default_factory=list)


class EntityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    object_type_key: str
    object_type_id: UUID | None
    catalog_version: int
    status: str
    values: dict[str, Any]
    created_by: int | None = None
    updated_by: int | None = None
    record_version: int = 1
    record_number: int
    recordNumber: int | None = None
    system_number: int | None = None
    is_system: bool = False
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
