from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.platform.runtime.entities.schemas import EntityRead
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceListItem


class PlanTreeEnsureRootOrderRead(BaseModel):
    anchor_entity_id: UUID
    ordered_root_ids: list[UUID] = Field(default_factory=list)


class PlanTreeReorderSiblingsRequest(BaseModel):
    parent_entity_id: UUID
    ordered_child_ids: list[UUID] = Field(default_factory=list)


class PlanTreeReorderSiblingsRead(BaseModel):
    updated_count: int


class PlanTreeMetaRead(BaseModel):
    total_entities: int = 0
    total_edges: int = 0
    loaded_entities: int = 0


class PlanTreeRead(BaseModel):
    anchor_entity_id: UUID
    root_ids: list[UUID] = Field(default_factory=list)
    entities: list[EntityRead] = Field(default_factory=list)
    instances: list[RelationInstanceListItem] = Field(default_factory=list)
    meta: PlanTreeMetaRead = Field(default_factory=PlanTreeMetaRead)
