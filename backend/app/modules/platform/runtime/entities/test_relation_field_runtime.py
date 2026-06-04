import pytest

from app.modules.platform.designer.publish.snapshot_builder import _serialize_field
from app.modules.platform.runtime.entities.validators import (
    validate_entity_create,
    validate_field_value,
)
from app.modules.platform.shared.enums import FieldType
from types import SimpleNamespace


def _relation_field_meta():
    return {
        "key": "project",
        "field_type": FieldType.RELATION.value,
        "is_required": False,
        "settings_json": {
            "relation_key": "task_project",
            "role": "source",
            "cardinality": "one",
        },
    }


def test_runtime_field_value_rejects_scalar_storage():
    with pytest.raises(ValueError, match="runtime_entity_values"):
        validate_field_value(_relation_field_meta(), "uuid-value")


def test_entity_create_ignores_relation_field_values():
    metadata = {
        "fields": [
            _relation_field_meta(),
            {"key": "title", "field_type": "text", "is_required": False},
        ],
    }
    validate_entity_create({"title": "A"}, metadata)

    with pytest.raises(ValueError, match="runtime_entity_values"):
        validate_entity_create({"project": "x", "title": "A"}, metadata)


def test_quick_create_create_skips_required_fields_not_in_quick_form():
    metadata = {
        "title_field_key": "title",
        "fields": [
            {
                "key": "title",
                "field_type": "text",
                "is_required": True,
                "quick_create": False,
            },
            {
                "key": "description",
                "field_type": "textarea",
                "is_required": True,
                "quick_create": False,
            },
        ],
    }

    validate_entity_create({"title": "Задача"}, metadata)


def test_quick_create_create_requires_title():
    metadata = {
        "title_field_key": "title",
        "fields": [
            {
                "key": "title",
                "field_type": "text",
                "is_required": True,
                "quick_create": False,
            },
        ],
    }

    with pytest.raises(ValueError, match="title"):
        validate_entity_create({}, metadata)


def test_serialize_field_preserves_relation_settings():
    field = SimpleNamespace(
        id="f1",
        key="project",
        name="Проект",
        description=None,
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
    payload = _serialize_field(field)
    assert payload["field_type"] == "relation"
    assert payload["settings_json"]["relation_key"] == "task_project"
    assert payload["settings_json"]["role"] == "source"
    assert payload["settings_json"]["cardinality"] == "one"
