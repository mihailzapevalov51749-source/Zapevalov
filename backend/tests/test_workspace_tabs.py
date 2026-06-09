"""Global workspace tabs service and access rules."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.platform.workspace_tabs.schemas import (
    WorkspaceTabCreate,
    WorkspaceTabReorder,
    WorkspaceTabReorderItem,
    WorkspaceTabUpdate,
)
from app.modules.platform.workspace_tabs.service import (
    create_workspace_tab,
    delete_workspace_tab,
    list_workspace_tabs,
    open_workspace_tab,
    reorder_workspace_tabs,
    update_workspace_tab,
)


def _user(*, user_id: int = 1, role_name: str = "user") -> SimpleNamespace:
    return SimpleNamespace(
        id=user_id,
        role=SimpleNamespace(name=role_name),
    )


def _tab_entity(
    *,
    user_id: int = 1,
    route: str = "/portal/1/object-types/tasks/plan",
    module_key: str = "office",
    tenant_id: int | None = 1,
):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        user_id=user_id,
        tenant_id=tenant_id,
        title="План",
        route=route,
        module_key=module_key,
        page_type="object_plan",
        icon_key=None,
        context_json={},
        is_pinned=True,
        is_minimized=False,
        sort_order=100,
        last_opened_at=now,
        created_at=now,
        updated_at=now,
    )


def test_create_workspace_tab_accepts_profile_panel_page_type() -> None:
    db = MagicMock()
    user = _user(role_name="platform_designer")
    created = _tab_entity(
        route="__panel__/profile/7",
        module_key="settings",
    )
    created.page_type = "profile_panel"
    created.context_json = {
        "panelType": "profile_panel",
        "userId": 7,
        "userName": "Михаил Запевалов",
        "panelState": {"activeTab": "contacts", "isEdit": False},
    }

    with patch(
        "app.modules.platform.workspace_tabs.service._ensure_tenant_exists",
        return_value=None,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.get_tab_by_route",
        return_value=None,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.create_tab",
        return_value=created,
    ):
        result = create_workspace_tab(
            db,
            user,
            WorkspaceTabCreate(
                title="Профиль: Михаил Запевалов",
                route="__panel__/profile/7",
                module_key="settings",
                page_type="profile_panel",
                context_json=created.context_json,
                is_minimized=True,
            ),
        )

    assert result.page_type == "profile_panel"
    assert result.route == "__panel__/profile/7"


def test_create_workspace_tab_persists_new_tab() -> None:
    db = MagicMock()
    user = _user(role_name="platform_designer")
    created = _tab_entity()

    with patch(
        "app.modules.platform.workspace_tabs.service._ensure_tenant_exists",
        return_value=None,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.get_tab_by_route",
        return_value=None,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.create_tab",
        return_value=created,
    ) as create_mock:
        result = create_workspace_tab(
            db,
            user,
            WorkspaceTabCreate(
                title="План",
                route="/portal/1/object-types/tasks/plan",
                module_key="office",
                page_type="object_plan",
                tenant_id=1,
                is_pinned=True,
            ),
        )

    assert result.route == created.route
    create_mock.assert_called_once()


def test_create_workspace_tab_duplicate_route_returns_existing() -> None:
    db = MagicMock()
    user = _user()
    existing = _tab_entity()

    with patch(
        "app.modules.platform.workspace_tabs.service._ensure_tenant_exists",
        return_value=None,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.get_tab_by_route",
        return_value=existing,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.save_tab",
        return_value=existing,
    ) as save_mock:
        result = create_workspace_tab(
            db,
            user,
            WorkspaceTabCreate(
                title="План",
                route=existing.route,
                module_key="office",
                page_type="object_plan",
                tenant_id=1,
            ),
        )

    save_mock.assert_called_once()
    assert result.id == existing.id


def test_list_workspace_tabs_only_current_user() -> None:
    db = MagicMock()
    user = _user(user_id=7)
    tab = _tab_entity(user_id=7)

    with patch(
        "app.modules.platform.workspace_tabs.service.repository.list_tabs_for_user",
        return_value=[tab],
    ) as list_mock:
        result = list_workspace_tabs(db, user)

    list_mock.assert_called_once_with(db, 7)
    assert len(result) == 1


def test_update_workspace_tab_requires_ownership() -> None:
    db = MagicMock()
    owner = _user(user_id=1)
    other_tab = _tab_entity(user_id=2)

    with patch(
        "app.modules.platform.workspace_tabs.service.repository.get_tab_for_user",
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            update_workspace_tab(
                db,
                owner,
                other_tab.id,
                WorkspaceTabUpdate(title="Новое"),
            )

    assert exc.value.status_code == 404


def test_cannot_update_another_users_tab_even_if_found() -> None:
    db = MagicMock()
    user = _user(user_id=1)
    tab = _tab_entity(user_id=1)

    with patch(
        "app.modules.platform.workspace_tabs.service.repository.get_tab_for_user",
        return_value=tab,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.save_tab",
        return_value=tab,
    ) as save_mock:
        result = update_workspace_tab(
            db,
            user,
            tab.id,
            WorkspaceTabUpdate(title="Обновлено"),
        )

    save_mock.assert_called_once()
    assert result.title == tab.title


def test_delete_workspace_tab_own_tab() -> None:
    db = MagicMock()
    user = _user(user_id=1)
    tab = _tab_entity(user_id=1)

    with patch(
        "app.modules.platform.workspace_tabs.service.repository.get_tab_for_user",
        return_value=tab,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.delete_tab",
    ) as delete_mock:
        delete_workspace_tab(db, user, tab.id)

    delete_mock.assert_called_once_with(db, tab)


def test_open_workspace_tab_updates_last_opened_at() -> None:
    db = MagicMock()
    user = _user(user_id=1)
    tab = _tab_entity(user_id=1)

    with patch(
        "app.modules.platform.workspace_tabs.service.repository.get_tab_for_user",
        return_value=tab,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.touch_tab_opened",
        return_value=tab,
    ) as touch_mock:
        open_workspace_tab(db, user, tab.id)

    touch_mock.assert_called_once()


def test_reorder_workspace_tabs() -> None:
    db = MagicMock()
    user = _user(user_id=1)
    tab_a = _tab_entity()
    tab_b = _tab_entity(route="/portal/1/object-types/projects")

    db.query.return_value.filter.return_value.all.return_value = [tab_a, tab_b]

    with patch(
        "app.modules.platform.workspace_tabs.service.list_workspace_tabs",
        return_value=[],
    ) as list_mock:
        reorder_workspace_tabs(
            db,
            user,
            WorkspaceTabReorder(
                items=[
                    WorkspaceTabReorderItem(id=tab_a.id, sort_order=10),
                    WorkspaceTabReorderItem(id=tab_b.id, sort_order=20),
                ],
            ),
        )

    db.commit.assert_called_once()
    list_mock.assert_called_once()


def test_create_rejects_invalid_module_key() -> None:
    db = MagicMock()
    user = _user()

    with pytest.raises(HTTPException) as exc:
        create_workspace_tab(
            db,
            user,
            WorkspaceTabCreate(
                title="Test",
                route="/test",
                module_key="unknown",
                page_type="generic",
            ),
        )

    assert exc.value.status_code == 422


def test_create_rejects_studio_for_ordinary_user() -> None:
    db = MagicMock()
    user = _user(role_name="user")

    with patch(
        "app.modules.platform.workspace_tabs.service._ensure_tenant_exists",
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            create_workspace_tab(
                db,
                user,
                WorkspaceTabCreate(
                    title="Studio",
                    route="/designer/tenant/1/object-types/uuid/actions",
                    module_key="studio",
                    page_type="studio_object_settings",
                    tenant_id=1,
                ),
            )

    assert exc.value.status_code == 403


def test_create_allows_studio_for_designer() -> None:
    db = MagicMock()
    user = _user(role_name="platform_designer")
    created = _tab_entity(module_key="studio", route="/designer/tenant/1/object-types/uuid/actions")

    with patch(
        "app.modules.platform.workspace_tabs.service._ensure_tenant_exists",
        return_value=None,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.get_tab_by_route",
        return_value=None,
    ), patch(
        "app.modules.platform.workspace_tabs.service.repository.create_tab",
        return_value=created,
    ):
        result = create_workspace_tab(
            db,
            user,
            WorkspaceTabCreate(
                title="Действия",
                route=created.route,
                module_key="studio",
                page_type="studio_object_settings",
                tenant_id=1,
            ),
        )

    assert result.module_key == "studio"
