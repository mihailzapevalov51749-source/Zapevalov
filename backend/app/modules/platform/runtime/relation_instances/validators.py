from uuid import UUID

from app.modules.platform.runtime.catalog.service import PublishedRelationMetadata
from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.platform.shared.enums import RelationType


def validate_relation_instance_create(
    *,
    relation_metadata: PublishedRelationMetadata,
    source_entity: RuntimeEntity,
    target_entity: RuntimeEntity,
    source_entity_id: UUID,
    target_entity_id: UUID,
) -> None:
    errors: list[str] = []

    if not relation_metadata.is_active:
        errors.append(f"Relation '{relation_metadata.relation_key}' не активна в catalog")

    if source_entity_id == target_entity_id:
        errors.append("source_entity_id и target_entity_id не могут совпадать")

    if source_entity.object_type_key != relation_metadata.source_object_type_key:
        errors.append(
            "source_entity object_type_key не совпадает с relation.source_object_type_key",
        )

    if target_entity.object_type_key != relation_metadata.target_object_type_key:
        errors.append(
            "target_entity object_type_key не совпадает с relation.target_object_type_key",
        )

    if relation_metadata.relation_type not in {
        RelationType.ONE_TO_ONE.value,
        RelationType.ONE_TO_MANY.value,
        RelationType.MANY_TO_MANY.value,
    }:
        errors.append(
            f"Неподдерживаемый relation_type: {relation_metadata.relation_type}",
        )

    if errors:
        raise ValueError("; ".join(errors))
