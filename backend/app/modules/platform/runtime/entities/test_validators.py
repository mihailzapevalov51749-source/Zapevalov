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


def _file_field_meta(*, multiple: bool = True):
    return {
        "key": "attachments",
        "field_type": FieldType.FILE,
        "settings_json": {"multiple": multiple},
    }


def test_file_field_accepts_null():
    validate_field_value(_file_field_meta(), None)


def test_file_field_accepts_metadata_array():
    validate_field_value(
        _file_field_meta(),
        [
            {
                "file_id": "abc123.pdf",
                "file_name": "ТЗ.docx",
                "mime_type": "application/pdf",
                "size": 1024,
                "file_url": "/files/documents/abc123.pdf",
            },
        ],
    )


def test_file_field_rejects_non_array():
    with pytest.raises(ValueError):
        validate_field_value(_file_field_meta(), {"file_id": "x"})


def test_file_field_rejects_multiple_when_disabled():
    with pytest.raises(ValueError):
        validate_field_value(
            _file_field_meta(multiple=False),
            [
                {"file_id": "a.pdf"},
                {"file_id": "b.pdf"},
            ],
        )


def test_file_field_rejects_entry_without_file_id():
    with pytest.raises(ValueError):
        validate_field_value(_file_field_meta(), [{"file_name": "orphan.pdf"}])
