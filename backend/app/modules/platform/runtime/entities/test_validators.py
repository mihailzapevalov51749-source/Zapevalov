import pytest

from app.modules.platform.runtime.entities.validators import validate_field_value
from app.modules.platform.shared.enums import FieldType


def _user_field_meta():
    return {"key": "assignee", "field_type": FieldType.USER}


def test_user_field_accepts_null():
    validate_field_value(_user_field_meta(), None)


def test_user_field_accepts_positive_int():
    validate_field_value(_user_field_meta(), 42)


def test_user_field_accepts_numeric_string():
    validate_field_value(_user_field_meta(), "42")


def test_user_field_rejects_invalid_values():
    with pytest.raises(ValueError):
        validate_field_value(_user_field_meta(), "not-a-id")

    with pytest.raises(ValueError):
        validate_field_value(_user_field_meta(), 0)

    with pytest.raises(ValueError):
        validate_field_value(_user_field_meta(), True)
