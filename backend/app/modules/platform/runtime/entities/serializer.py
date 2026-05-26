from typing import Any

from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.entities.schemas import EntityRead


def values_dict(value_rows: list[RuntimeEntityValue]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for row in value_rows:
        result[row.field_key] = row.value_json
    return result


def serialize_entity(
    entity: RuntimeEntity,
    value_rows: list[RuntimeEntityValue],
) -> EntityRead:
    return EntityRead(
        id=entity.id,
        tenant_id=entity.tenant_id,
        object_type_key=entity.object_type_key,
        object_type_id=entity.object_type_id,
        catalog_version=entity.catalog_version,
        status=entity.status,
        values=values_dict(value_rows),
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        deleted_at=entity.deleted_at,
    )
