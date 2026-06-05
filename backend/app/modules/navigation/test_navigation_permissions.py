from types import SimpleNamespace

import pytest

from app.modules.navigation.permissions import (
    assert_can_delete_navigation_item,
    can_manage_navigation,
    get_navigation_delete_block_reason,
)


def _user(role_name: str):
    return SimpleNamespace(role=SimpleNamespace(name=role_name))


def _item(**overrides):
    defaults = {
        "id": 1,
        "is_protected": False,
        "is_system": False,
        "deleted_at": None,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def test_superadmin_can_manage_navigation():
    assert can_manage_navigation(_user("superadmin")) is True


def test_regular_user_cannot_manage_navigation():
    assert can_manage_navigation(_user("user")) is False


def test_protected_item_has_block_reason():
    reason = get_navigation_delete_block_reason(_item(is_protected=True))
    assert reason is not None
    assert "системным" in reason


def test_superadmin_cannot_delete_protected_item():
    with pytest.raises(ValueError, match="системным"):
        assert_can_delete_navigation_item(_user("superadmin"), _item(is_protected=True))


def test_superadmin_can_delete_regular_item():
    assert_can_delete_navigation_item(_user("superadmin"), _item())
