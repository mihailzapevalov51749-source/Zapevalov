"""Unit tests for navigation service tenant scoping."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.navigation import service
from app.modules.navigation.schemas import NavigationItemMove, NavigationItemUpdate
from app.modules.navigation.tenant_access import (
    NAVIGATION_PORTAL_FORBIDDEN_DETAIL,
    assert_navigation_item_belongs_to_portal,
    get_navigation_item_for_portal,
)
from app.modules.platform.shared.dependencies import (
    _assert_tenant_exists_and_accessible,
    require_tenant_membership,
)


def test_assert_navigation_item_belongs_to_portal_blocks_mismatch() -> None:
    item = SimpleNamespace(portal_id=1)

    with pytest.raises(HTTPException) as exc_info:
        assert_navigation_item_belongs_to_portal(item, 2)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == NAVIGATION_PORTAL_FORBIDDEN_DETAIL


def test_get_navigation_item_for_portal_returns_none_for_missing_item() -> None:
    class _Query:
        def filter(self, *_args, **_kwargs):
            return self

        def first(self):
            return None

    db = MagicMock()
    db.query.return_value = _Query()

    assert get_navigation_item_for_portal(db, 999_999, 1) is None


def test_assert_tenant_exists_and_accessible_blocks_foreign_tenant(monkeypatch) -> None:
    db = MagicMock()
    user = SimpleNamespace(id=1, tenant_id=99)

    monkeypatch.setattr(
        "app.modules.platform.shared.dependencies.user_has_tenant_access",
        lambda _db, _user, tenant_id: False,
    )

    portal = SimpleNamespace(id=1)
    db.query.return_value.filter.return_value.first.return_value = portal

    with pytest.raises(HTTPException) as exc_info:
        _assert_tenant_exists_and_accessible(db, 1, user)

    assert exc_info.value.status_code == 403


def test_require_tenant_membership_allows_platform_owner(monkeypatch) -> None:
    db = MagicMock()
    owner = SimpleNamespace(id=2, tenant_id=None, is_platform_owner=True)
    portal = SimpleNamespace(id=5)

    db.query.return_value.filter.return_value.first.return_value = portal

    monkeypatch.setattr(
        "app.modules.platform.shared.dependencies.user_has_tenant_access",
        lambda _db, _user, tenant_id: True,
    )

    resolved = require_tenant_membership(
        tenant_id=5,
        db=db,
        current_user=owner,
    )

    assert resolved == 5


def test_update_item_returns_none_for_foreign_portal(monkeypatch) -> None:
    item = SimpleNamespace(
        id=10,
        portal_id=2,
        is_folder=False,
        is_protected=False,
        type="page",
        object_type_id=None,
        parent_id=None,
    )

    monkeypatch.setattr(
        "app.modules.navigation.service.get_navigation_item_for_portal",
        lambda _db, _item_id, portal_id: item if portal_id == 2 else None,
    )
    monkeypatch.setattr(
        "app.modules.navigation.service.repository.update_item",
        lambda *_args, **_kwargs: item,
    )
    monkeypatch.setattr(
        "app.modules.navigation.service.enrich_navigation_list",
        lambda _db, rows: rows,
    )

    db = MagicMock()

    assert service.update_item(db, 1, 10, NavigationItemUpdate(title="X")) is None
    assert service.update_item(db, 2, 10, NavigationItemUpdate(title="X")) is not None


def test_move_items_rejects_foreign_portal_item(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.modules.navigation.service.get_navigation_item_for_portal",
        lambda _db, item_id, portal_id: (
            None if portal_id == 1 and item_id == 99 else SimpleNamespace(id=item_id)
        ),
    )

    db = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        service.move_items(
            db,
            1,
            [NavigationItemMove(id=99, parent_id=None, sort_order=0)],
        )

    assert exc_info.value.status_code == 403
