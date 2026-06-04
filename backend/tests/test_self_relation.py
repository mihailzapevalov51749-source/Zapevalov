"""Self-relation: Object A → Object A via Relation Engine."""

from types import SimpleNamespace
from uuid import uuid4

from app.modules.platform.designer.publish.draft_loader import TenantDraftCatalog
from app.modules.platform.designer.publish.validators import validate_tenant_draft_catalog
from app.modules.platform.designer.relation_definitions.schemas import (
    validate_relation_business_rules,
)
from app.modules.platform.runtime.catalog.service import PublishedRelationMetadata
from app.modules.platform.runtime.relation_instances import validators as instance_validators
from app.modules.platform.shared.enums import FieldType, RelationType


def test_relation_definition_allows_same_object_type() -> None:
    object_type_id = uuid4()

    validate_relation_business_rules(
        relation_type=RelationType.ONE_TO_MANY,
        source_object_type_id=object_type_id,
        target_object_type_id=object_type_id,
        bidirectional=True,
        reverse_name="Связанные записи",
        cascade_delete=False,
        source_is_system=False,
        target_is_system=False,
    )


def test_publish_accepts_self_relation_definition() -> None:
    object_type_id = uuid4()
    object_type = SimpleNamespace(
        id=object_type_id,
        tenant_id=1,
        key="task",
        name="Задача",
        status="active",
        deleted_at=None,
    )
    relation = SimpleNamespace(
        key="task_related",
        source_object_type_id=object_type_id,
        target_object_type_id=object_type_id,
        relation_type="many_to_many",
        reverse_name="Связанные задачи",
        bidirectional=True,
        cascade_delete=False,
        is_active=True,
        deleted_at=None,
    )
    field = SimpleNamespace(
        id=uuid4(),
        tenant_id=1,
        object_type_id=object_type_id,
        key="related_tasks",
        name="Связанные задачи",
        field_type=FieldType.RELATION.value,
        sort_order=0,
        is_required=False,
        is_unique=False,
        is_system=False,
        default_value_json=None,
        settings_json={
            "relation_key": "task_related",
            "role": "source",
            "cardinality": "many",
        },
        validation_json={},
        visibility_json={},
    )
    view = SimpleNamespace(
        id=uuid4(),
        tenant_id=1,
        object_type_id=object_type_id,
        key="default_table",
        name="Таблица",
        view_type="table",
        is_default=True,
        is_system=True,
        is_active=True,
        sort_order=0,
        settings_json={
            "projection": {
                "visible_fields": ["related_tasks"],
                "field_order": ["related_tasks"],
            },
        },
        layout_json={},
        filters_json={},
        visibility_json={},
    )

    report = validate_tenant_draft_catalog(
        TenantDraftCatalog(
            object_types=[object_type],
            fields=[field],
            relations=[relation],
            views=[view],
        ),
    )

    assert not report.errors


def _entity(entity_id, object_type_key: str):
    entity = SimpleNamespace()
    entity.id = entity_id
    entity.object_type_key = object_type_key
    return entity


def test_relation_instance_allows_records_in_same_object_type() -> None:
    source_id = uuid4()
    target_id = uuid4()
    metadata = PublishedRelationMetadata(
        tenant_id=1,
        catalog_version=1,
        relation_id=uuid4(),
        relation_key="task_related",
        relation_type=RelationType.MANY_TO_MANY.value,
        source_object_type_key="task",
        target_object_type_key="task",
        is_active=True,
        settings_json={},
    )

    instance_validators.validate_relation_instance_create(
        relation_metadata=metadata,
        source_entity=_entity(source_id, "task"),
        target_entity=_entity(target_id, "task"),
        source_entity_id=source_id,
        target_entity_id=target_id,
    )


def test_relation_instance_allows_self_link() -> None:
    entity_id = uuid4()
    metadata = PublishedRelationMetadata(
        tenant_id=1,
        catalog_version=1,
        relation_id=uuid4(),
        relation_key="task_related",
        relation_type=RelationType.MANY_TO_MANY.value,
        source_object_type_key="task",
        target_object_type_key="task",
        is_active=True,
        settings_json={},
    )

    instance_validators.validate_relation_instance_create(
        relation_metadata=metadata,
        source_entity=_entity(entity_id, "task"),
        target_entity=_entity(entity_id, "task"),
        source_entity_id=entity_id,
        target_entity_id=entity_id,
    )
