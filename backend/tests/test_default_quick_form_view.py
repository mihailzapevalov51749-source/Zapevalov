"""Default Quick Form view ensure, uniqueness and self-healing."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.view_definitions.quick_form_view_registry import (
    acquire_default_quick_form_view_lock,
    reconcile_duplicate_default_quick_form_views,
)


def _quick_form_view(view_id, *, created_at=None) -> DesignerViewDefinition:
    return DesignerViewDefinition(
        id=view_id,
        tenant_id=1,
        object_type_id=uuid4(),
        key="default_quick_form",
        name="Быстрая форма",
        view_type="quick_form",
        is_default=False,
        is_system=True,
        is_active=True,
        sort_order=900,
        settings_json={},
        layout_json={},
        filters_json={},
        visibility_json={},
        draft_revision=1,
        created_at=created_at or datetime.now(timezone.utc),
        updated_at=created_at or datetime.now(timezone.utc),
    )


def test_reconcile_duplicate_default_quick_form_views_keeps_oldest() -> None:
    first_id = uuid4()
    second_id = uuid4()
    db = MagicMock()
    views = [
        _quick_form_view(first_id, created_at=datetime(2026, 1, 1, tzinfo=timezone.utc)),
        _quick_form_view(second_id, created_at=datetime(2026, 2, 1, tzinfo=timezone.utc)),
    ]

    with patch(
        "app.modules.platform.designer.view_definitions.quick_form_view_registry.repository.list_by_key",
        return_value=views,
    ):
        canonical = reconcile_duplicate_default_quick_form_views(db, 1, views[0].object_type_id)

    assert canonical.id == first_id
    assert views[1].deleted_at is not None


def test_ensure_returns_existing_without_create() -> None:
    from app.modules.platform.designer.view_definitions.service import (
        ensure_default_quick_form_view,
    )

    object_type_id = uuid4()
    existing = _quick_form_view(uuid4())
    existing.object_type_id = object_type_id
    object_type = SimpleNamespace(id=object_type_id, key="idei", name="Идеи")
    db = MagicMock()

    with (
        patch(
            "app.modules.platform.designer.view_definitions.service._get_object_type_or_404",
            return_value=object_type,
        ),
        patch(
            "app.modules.platform.designer.view_definitions.service.acquire_default_quick_form_view_lock",
        ),
        patch(
            "app.modules.platform.designer.view_definitions.service.reconcile_duplicate_default_quick_form_views",
            return_value=existing,
        ),
        patch(
            "app.modules.platform.designer.view_definitions.service.repository.create_view",
        ) as create_view,
    ):
        result = ensure_default_quick_form_view(db, 1, object_type_id)

    assert result is not None
    assert result.key == "default_quick_form"
    create_view.assert_not_called()


def test_ensure_skips_create_when_no_quick_create_fields() -> None:
    from app.modules.platform.designer.view_definitions.service import (
        ensure_default_quick_form_view,
    )

    object_type_id = uuid4()
    object_type = SimpleNamespace(id=object_type_id, key="empty", name="Empty")
    db = MagicMock()

    with (
        patch(
            "app.modules.platform.designer.view_definitions.service._get_object_type_or_404",
            return_value=object_type,
        ),
        patch(
            "app.modules.platform.designer.view_definitions.service.acquire_default_quick_form_view_lock",
        ),
        patch(
            "app.modules.platform.designer.view_definitions.service.reconcile_duplicate_default_quick_form_views",
            return_value=None,
        ),
        patch(
            "app.modules.platform.designer.view_definitions.service._list_quick_form_fields",
            return_value=[],
        ),
        patch(
            "app.modules.platform.designer.view_definitions.service.repository.create_view",
        ) as create_view,
    ):
        result = ensure_default_quick_form_view(db, 1, object_type_id)

    assert result is None
    create_view.assert_not_called()


def test_acquire_default_quick_form_view_lock_uses_pg_advisory_lock() -> None:
    db = MagicMock()
    acquire_default_quick_form_view_lock(db, 1, uuid4())
    db.execute.assert_called_once()
    assert "pg_advisory_xact_lock" in str(db.execute.call_args[0][0])


def test_build_quick_form_projection_uses_quick_create_fields() -> None:
    from app.modules.platform.designer.view_definitions.service import (
        _build_quick_form_projection,
    )

    fields = [
        SimpleNamespace(
            key="title",
            field_type="text",
            sort_order=0,
            is_system=False,
            quick_create=False,
            settings_json={"is_title": True},
        ),
        SimpleNamespace(
            key="status",
            field_type="text",
            sort_order=1,
            is_system=False,
            quick_create=True,
            settings_json={},
        ),
    ]

    projection = _build_quick_form_projection(fields)

    assert projection["fieldKeys"] == ["title", "status"]
    assert projection["titleFieldKey"] == "title"
