from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance
from app.modules.platform.runtime.relation_instances.schemas import (
    RelationInstanceListItem,
    RelationInstanceRead,
)


def serialize_relation_instance(instance: RuntimeRelationInstance) -> RelationInstanceRead:
    return RelationInstanceRead(
        id=instance.id,
        tenant_id=instance.tenant_id,
        relation_key=instance.relation_key,
        relation_id=instance.relation_id,
        catalog_version=instance.catalog_version,
        source_entity_id=instance.source_entity_id,
        target_entity_id=instance.target_entity_id,
        source_object_type_key=instance.source_object_type_key,
        target_object_type_key=instance.target_object_type_key,
        status=instance.status,
        created_at=instance.created_at,
        updated_at=instance.updated_at,
        deleted_at=instance.deleted_at,
    )


def serialize_relation_instance_list_item(
    instance: RuntimeRelationInstance,
) -> RelationInstanceListItem:
    return RelationInstanceListItem(
        id=instance.id,
        tenant_id=instance.tenant_id,
        relation_key=instance.relation_key,
        relation_id=instance.relation_id,
        catalog_version=instance.catalog_version,
        source_entity_id=instance.source_entity_id,
        target_entity_id=instance.target_entity_id,
        source_object_type_key=instance.source_object_type_key,
        target_object_type_key=instance.target_object_type_key,
        status=instance.status,
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )
