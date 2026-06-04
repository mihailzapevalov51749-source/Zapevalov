from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceRead


class RelationFieldLinkMutation(BaseModel):
    target_entity_id: UUID


class RelationFieldLinkedEntity(BaseModel):
    entity_id: UUID
    title: str
    relation_instance_id: UUID


class RelationFieldStateRead(BaseModel):
    field_key: str
    field_type: str = "relation"
    relation_key: str
    role: str
    cardinality: str
    items: list[RelationFieldLinkedEntity]


class RelationFieldMetadataRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    field_key: str
    field_type: str
    relation_key: str
    role: str
    cardinality: str


class RelationFieldLinkResult(BaseModel):
    field: RelationFieldMetadataRead
    relation_instance: RelationInstanceRead
    linked_entity: RelationFieldLinkedEntity
