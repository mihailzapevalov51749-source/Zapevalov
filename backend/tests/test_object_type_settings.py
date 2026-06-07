"""Tests for object type navigation visibility settings."""

from app.modules.platform.shared.object_type_settings import (
    default_object_type_settings,
    resolve_show_in_navigation,
    with_show_in_navigation,
)


def test_default_show_in_navigation_is_false() -> None:
    assert default_object_type_settings()["show_in_navigation"] is False
    assert resolve_show_in_navigation({}) is False


def test_with_show_in_navigation_merges_settings() -> None:
    merged = with_show_in_navigation({"foo": "bar"}, show_in_navigation=True)
    assert merged["foo"] == "bar"
    assert merged["show_in_navigation"] is True
