from typing import Any

from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.entities.schemas import EntityRead
from app.modules.platform.runtime.entities.system_fields import system_values_from_entity


def values_dict(value_rows: list[RuntimeEntityValue]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for row in value_rows:
        result[row.field_key] = row.value_json
    return result


def serialize_entity(
    entity: RuntimeEntity,
    value_rows: list[RuntimeEntityValue],
) -> EntityRead:
    merged_values = values_dict(value_rows)
    merged_values.update(system_values_from_entity(entity))

    record_number = int(getattr(entity, "record_number", 0) or 0)

    return EntityRead(
        id=entity.id,
        tenant_id=entity.tenant_id,
        object_type_key=entity.object_type_key,
        object_type_id=entity.object_type_id,
        catalog_version=entity.catalog_version,
        status=entity.status,
        values=merged_values,
        created_by=entity.created_by,
        updated_by=entity.updated_by,
        record_version=int(entity.record_version or 1),
        record_number=record_number,
        recordNumber=record_number,
        system_number=record_number,
        is_system=bool(getattr(entity, "is_system", False)),
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        deleted_at=entity.deleted_at,
    )
