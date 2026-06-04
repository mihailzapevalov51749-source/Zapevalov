from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.platform.designer.publish.draft_loader import TenantDraftCatalog
from app.modules.platform.designer.publish.validators import validate_tenant_draft_catalog
from app.modules.platform.shared.enums import FieldType
from app.modules.platform.shared.relation_field_contract import (
    MISSING_RELATION_DEFINITION_PUBLISH_TEMPLATE,
    UNKNOWN_RELATION_DEFINITION,
    validate_relation_field_for_publish,
    validate_relation_field_settings,
    validate_relation_field_type_payload,
    validate_relation_field_with_definition,
)


def _relation(*, key: str, source_id, target_id, is_active: bool = True):
    return SimpleNamespace(
        key=key,
        source_object_type_id=source_id,
        target_object_type_id=target_id,
        relation_type="one_to_many",
        reverse_name="Задачи",
        bidirectional=True,
        cascade_delete=False,
        is_active=is_active,
        deleted_at=None,
    )


def test_relation_is_valid_field_type_enum():
    assert FieldType.RELATION.value == "relation"
    assert FieldType("relation") == FieldType.RELATION


def test_relation_field_requires_settings():
    with pytest.raises(ValueError, match="relation_key"):
        validate_relation_field_settings({})

    with pytest.raises(ValueError, match="role"):
        validate_relation_field_settings({"relation_key": "task_project"})

    with pytest.raises(ValueError, match="cardinality"):
        validate_relation_field_settings(
            {"relation_key": "task_project", "role": "source"},
        )


def test_relation_field_rejects_invalid_role_and_cardinality():
    with pytest.raises(ValueError, match="role"):
        validate_relation_field_settings(
            {
                "relation_key": "task_project",
                "role": "invalid",
                "cardinality": "one",
            },
        )

    with pytest.raises(ValueError, match="cardinality"):
        validate_relation_field_settings(
            {
                "relation_key": "task_project",
                "role": "source",
                "cardinality": "invalid",
            },
        )


def test_relation_field_rejects_default_value():
    with pytest.raises(ValueError, match="default_value_json"):
        validate_relation_field_type_payload(
            default_value_json="x",
            settings_json={
                "relation_key": "task_project",
                "role": "source",
                "cardinality": "one",
            },
        )


def test_relation_field_binding_source_and_target():
    object_type_id = uuid4()
    other_type_id = uuid4()
    relation = _relation(
        key="task_project",
        source_id=object_type_id,
        target_id=other_type_id,
    )

    validate_relation_field_with_definition(
        settings_json={
            "relation_key": "task_project",
            "role": "source",
            "cardinality": "one",
        },
        object_type_id=object_type_id,
        relation=relation,
    )

    validate_relation_field_with_definition(
        settings_json={
            "relation_key": "task_project",
            "role": "target",
            "cardinality": "many",
        },
        object_type_id=other_type_id,
        relation=relation,
    )


def test_relation_field_unknown_definition():
    with pytest.raises(ValueError, match=UNKNOWN_RELATION_DEFINITION):
        validate_relation_field_with_definition(
            settings_json={
                "relation_key": "missing",
                "role": "source",
                "cardinality": "one",
            },
            object_type_id=uuid4(),
            relation=None,
        )


def test_relation_field_wrong_role_for_object_type():
    object_type_id = uuid4()
    relation = _relation(
        key="task_project",
        source_id=object_type_id,
        target_id=uuid4(),
    )

    with pytest.raises(ValueError, match="role=target"):
        validate_relation_field_with_definition(
            settings_json={
                "relation_key": "task_project",
                "role": "target",
                "cardinality": "one",
            },
            object_type_id=object_type_id,
            relation=relation,
        )


def test_publish_missing_relation_definition():
    object_type_id = uuid4()
    issues = validate_relation_field_for_publish(
        field_key="project",
        settings_json={
            "relation_key": "task_project",
            "role": "source",
            "cardinality": "one",
        },
        object_type_id=object_type_id,
        relations_by_key={},
    )
    assert len(issues) == 1
    assert issues[0].message == MISSING_RELATION_DEFINITION_PUBLISH_TEMPLATE.format(
        relation_key="task_project",
    )


def test_publish_catalog_accepts_self_relation_field():
    object_type_id = uuid4()
    object_type = SimpleNamespace(
        id=object_type_id,
        tenant_id=1,
        key="task",
        name="Задача",
        status="active",
        deleted_at=None,
    )
    relation = _relation(
        key="task_related",
        source_id=object_type_id,
        target_id=object_type_id,
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
            "projection": {"visible_fields": ["related_tasks"], "field_order": ["related_tasks"]},
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


def test_relation_field_binding_self_relation_object_type():
    object_type_id = uuid4()
    relation = _relation(
        key="task_related",
        source_id=object_type_id,
        target_id=object_type_id,
    )

    validate_relation_field_with_definition(
        settings_json={
            "relation_key": "task_related",
            "role": "source",
            "cardinality": "many",
        },
        object_type_id=object_type_id,
        relation=relation,
    )

    validate_relation_field_with_definition(
        settings_json={
            "relation_key": "task_related",
            "role": "target",
            "cardinality": "many",
        },
        object_type_id=object_type_id,
        relation=relation,
    )


def test_publish_catalog_accepts_relation_field():
    object_type_id = uuid4()
    target_type_id = uuid4()
    object_type = SimpleNamespace(
        id=object_type_id,
        tenant_id=1,
        key="task",
        name="Задача",
        status="active",
        deleted_at=None,
    )
    target_object_type = SimpleNamespace(
        id=target_type_id,
        tenant_id=1,
        key="project",
        name="Проект",
        status="active",
        deleted_at=None,
    )
    relation = _relation(
        key="task_project",
        source_id=object_type_id,
        target_id=target_type_id,
    )
    field = SimpleNamespace(
        id=uuid4(),
        tenant_id=1,
        object_type_id=object_type_id,
        key="project",
        name="Проект",
        field_type=FieldType.RELATION.value,
        sort_order=0,
        is_required=False,
        is_unique=False,
        is_system=False,
        default_value_json=None,
        settings_json={
            "relation_key": "task_project",
            "role": "source",
            "cardinality": "one",
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
            "projection": {"visible_fields": ["project"], "field_order": ["project"]},
        },
        layout_json={},
        filters_json={},
        visibility_json={},
    )

    report = validate_tenant_draft_catalog(
        TenantDraftCatalog(
            object_types=[object_type, target_object_type],
            fields=[field],
            relations=[relation],
            views=[view],
        ),
    )

    assert not report.errors
