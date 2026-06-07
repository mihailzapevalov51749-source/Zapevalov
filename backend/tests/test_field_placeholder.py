import pytest

from app.modules.platform.designer.publish.snapshot_builder import _serialize_field
from app.modules.platform.shared.enums import FieldType


class _FieldStub:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", "00000000-0000-0000-0000-000000000001")
        self.key = kwargs.get("key", "summary")
        self.name = kwargs.get("name", "Summary")
        self.description = kwargs.get("description", "Field description")
        self.placeholder = kwargs.get("placeholder", "Enter summary")
        self.field_type = kwargs.get("field_type", FieldType.TEXT.value)
        self.sort_order = kwargs.get("sort_order", 0)
        self.is_required = kwargs.get("is_required", False)
        self.is_unique = kwargs.get("is_unique", False)
        self.quick_create = kwargs.get("quick_create", False)
        self.is_system = kwargs.get("is_system", False)
        self.default_value_json = kwargs.get("default_value_json")
        self.settings_json = kwargs.get("settings_json", {})
        self.validation_json = kwargs.get("validation_json", {})
        self.visibility_json = kwargs.get("visibility_json", {})


def test_serialize_field_includes_placeholder() -> None:
    payload = _serialize_field(
        _FieldStub(placeholder="Опишите текущее нежелательное поведение"),
    )

    assert payload["placeholder"] == "Опишите текущее нежелательное поведение"
    assert payload["description"] == "Field description"


def test_serialize_field_placeholder_defaults_to_none() -> None:
    payload = _serialize_field(_FieldStub(placeholder=None))

    assert payload["placeholder"] is None
