"""Office user table views — column order persistence contract."""

from datetime import datetime, timezone
from uuid import uuid4

from app.modules.platform.runtime.office_user_views.models import RuntimeOfficeUserTableView
from app.modules.platform.runtime.office_user_views.schemas import OfficeUserTableViewCreate
from unittest.mock import MagicMock

from app.modules.platform.runtime.office_user_views import repository
from app.modules.platform.runtime.office_user_views.schemas import OfficeUserTableViewUpdate
from app.modules.platform.runtime.office_user_views.service import (
    _serialize,
    list_user_table_views,
    update_user_table_view,
)


def _sample_settings(column_order: list[str]) -> dict:
    return {
        "columns": [
            {"fieldKey": key, "visible": True, "width": 200}
            for key in column_order
        ],
        "projection": {
            "visible_fields": column_order,
            "field_order": column_order,
            "title_field": column_order[0] if column_order else None,
        },
        "objectView": {
            "schemaVersion": 1,
            "presentation": {
                "table": {
                    "columnOrder": column_order,
                    "hiddenFieldKeys": [],
                    "columnWidths": {},
                }
            },
        },
    }


def _entity(**overrides):
    now = datetime(2026, 6, 5, 12, 0, tzinfo=timezone.utc)
    defaults = {
        "id": uuid4(),
        "tenant_id": 1,
        "owner_user_id": 10,
        "object_type_key": "task",
        "view_key": "my_tasks",
        "name": "Мои задачи",
        "view_type": "table",
        "is_default": False,
        "is_visible": True,
        "settings_json": {},
        "filters_json": {},
        "layout_json": {},
        "visibility_json": {},
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(overrides)
    return RuntimeOfficeUserTableView(**defaults)


def test_serialize_preserves_column_order_in_settings_json():
    column_order = ["title", "description", "status", "finish_date"]
    entity = _entity(settings_json=_sample_settings(column_order))

    serialized = _serialize(entity)

    assert serialized.key == "my_tasks"
    assert [item["fieldKey"] for item in serialized.settings_json["columns"]] == column_order
    assert serialized.settings_json["projection"]["field_order"] == column_order


def test_create_schema_accepts_ordered_columns_payload():
    column_order = ["title", "finish_date", "description"]
    payload = OfficeUserTableViewCreate(
        key="view_a",
        name="Представление А",
        settings_json=_sample_settings(column_order),
    )

    assert [item["fieldKey"] for item in payload.settings_json["columns"]] == column_order


def test_different_views_keep_independent_column_order():
    order_a = ["title", "status", "description"]
    order_b = ["title", "finish_date", "status"]

    entity_a = _entity(
        view_key="view_a",
        name="A",
        settings_json=_sample_settings(order_a),
    )
    entity_b = _entity(
        owner_user_id=20,
        view_key="view_b",
        name="B",
        settings_json=_sample_settings(order_b),
    )

    serialized_a = _serialize(entity_a)
    serialized_b = _serialize(entity_b)

    assert serialized_a.owner_user_id == 10
    assert serialized_b.owner_user_id == 20
    assert [c["fieldKey"] for c in serialized_a.settings_json["columns"]] == order_a
    assert [c["fieldKey"] for c in serialized_b.settings_json["columns"]] == order_b


def test_list_user_table_views_returns_default_view_key_after_set_default(monkeypatch):
    """Regression: default_view.view_key must be used (not .key) or list endpoint 500s."""
    views = [
        _entity(view_key="view_a", name="A", is_default=False),
        _entity(view_key="my_tasks", name="Мои задачи", is_default=True),
    ]

    monkeypatch.setattr(repository, "list_views", lambda *args, **kwargs: views)

    result = list_user_table_views(
        MagicMock(),
        tenant_id=1,
        owner_user_id=10,
        object_type_key="task",
    )

    assert result.default_view_key == "my_tasks"
    assert len(result.views) == 2
    assert result.default_view_id == views[1].id
    assert result.default_view_key == "my_tasks"
    assert result.views[1].is_default is True
    assert result.views[0].is_default is False


def test_update_user_table_view_set_default_clears_other_defaults(monkeypatch):
    view_a = _entity(view_key="view_a", name="A", is_default=True)
    view_b = _entity(view_key="view_b", name="B", is_default=False)
    cleared = {"called": False}

    def fake_clear_default_flags(db, *, tenant_id, owner_user_id, object_type_key):
        cleared["called"] = True
        view_a.is_default = False

    monkeypatch.setattr(repository, "get_by_id", lambda *args, **kwargs: view_b)
    monkeypatch.setattr(repository, "clear_default_flags", fake_clear_default_flags)
    monkeypatch.setattr(repository, "list_views", lambda *args, **kwargs: [view_a, view_b])
    monkeypatch.setattr(repository, "commit", lambda db: None)
    monkeypatch.setattr(repository, "refresh", lambda db, entity: None)

    result = update_user_table_view(
        MagicMock(),
        tenant_id=1,
        owner_user_id=10,
        object_type_key="task",
        view_id=view_b.id,
        payload=OfficeUserTableViewUpdate(is_default=True),
    )

    assert cleared["called"] is True
    assert view_a.is_default is False
    assert view_b.is_default is True
    assert result.is_default is True
    assert result.key == "view_b"


def test_list_user_table_views_isolates_default_per_owner(monkeypatch):
    user_a_default = _entity(
        owner_user_id=10,
        view_key="my_tasks",
        is_default=True,
    )
    user_b_default = _entity(
        owner_user_id=20,
        view_key="urgent",
        is_default=True,
    )

    def fake_list_views(db, tenant_id, owner_user_id, object_type_key):
        return [item for item in [user_a_default, user_b_default] if item.owner_user_id == owner_user_id]

    monkeypatch.setattr(repository, "list_views", fake_list_views)

    result_a = list_user_table_views(
        MagicMock(),
        tenant_id=1,
        owner_user_id=10,
        object_type_key="task",
    )
    result_b = list_user_table_views(
        MagicMock(),
        tenant_id=1,
        owner_user_id=20,
        object_type_key="task",
    )

    assert result_a.default_view_key == "my_tasks"
    assert result_b.default_view_key == "urgent"
