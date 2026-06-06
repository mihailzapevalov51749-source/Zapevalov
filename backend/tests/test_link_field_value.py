import pytest

from app.modules.platform.runtime.entities.validators import validate_field_value
from app.modules.platform.shared.enums import FieldType
from app.modules.platform.shared.link_value import (
    is_blocked_link_scheme,
    normalize_link_field_value,
    validate_link_field_value,
)


def _link_field_meta():
    return {"key": "doc_link", "field_type": FieldType.LINK}


def test_link_field_accepts_null():
    validate_field_value(_link_field_meta(), None)


def test_link_field_accepts_http_url_string():
    validate_field_value(_link_field_meta(), "https://example.com")


def test_link_field_accepts_bare_domain():
    validate_field_value(_link_field_meta(), "example.com")


def test_link_field_accepts_legacy_object_with_url():
    validate_field_value(
        _link_field_meta(),
        {"label": "Docs", "url": "https://docs.example.com"},
    )


def test_link_field_rejects_javascript_scheme():
    with pytest.raises(ValueError):
        validate_field_value(_link_field_meta(), "javascript:alert(1)")


def test_link_field_rejects_unsupported_scheme():
    with pytest.raises(ValueError):
        validate_field_value(_link_field_meta(), "ftp://example.com")


def test_normalize_link_field_value_trims_string():
    assert normalize_link_field_value("  https://example.com  ") == "https://example.com"


def test_is_blocked_link_scheme():
    assert is_blocked_link_scheme("javascript:alert(1)") is True
    assert is_blocked_link_scheme("https://example.com") is False
