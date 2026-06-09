from uuid import UUID

from pydantic import BaseModel, Field


class PlanTreeEnsureRootOrderRead(BaseModel):
    anchor_entity_id: UUID
    ordered_root_ids: list[UUID] = Field(default_factory=list)


class PlanTreeReorderSiblingsRequest(BaseModel):
    parent_entity_id: UUID
    ordered_child_ids: list[UUID] = Field(default_factory=list)


class PlanTreeReorderSiblingsRead(BaseModel):
    updated_count: int
