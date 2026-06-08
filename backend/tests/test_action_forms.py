"""Designer Action Form CRUD and publish contract."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.platform.action_engine.action_forms import service as action_form_service
from app.modules.platform.action_engine.action_forms.schemas import (
    ActionFormCreate,
    ActionFormFieldCreate,
)
from app.modules.platform.designer.publish.draft_loader import TenantDraftCatalog
from app.modules.platform.designer.publish.snapshot_builder import build_snapshot_payload
from app.modules.platform.runtime.actions.resolver import resolve_actions_for_placement


def _action_definition(*, object_type_id, is_system=False):
    return SimpleNamespace(
        id=uuid4(),
        object_type_id=object_type_id,
        key="create_task",
        name="Создать задачу",
        is_system=is_system,
    )


def _field_definition(*, object_type_id, key="title"):
    return SimpleNamespace(
        id=uuid4(),
        object_type_id=object_type_id,
        key=key,
        name=key.capitalize(),
        description=None,
        placeholder=None,
        field_type="text",
        sort_order=10,
        is_required=False,
        is_unique=False,
        quick_create=False,
        is_system=False,
        default_value_json=None,
        settings_json={},
        validation_json={},
        visibility_json={},
    )


def test_create_action_form_conflict_when_exists() -> None:
    db = MagicMock()
    object_type_id = uuid4()
    action = _action_definition(object_type_id=object_type_id)

    with (
        patch(
            "app.modules.platform.action_engine.action_forms.service._get_scoped_action_definition",
            return_value=action,
        ),
        patch(
            "app.modules.platform.action_engine.action_forms.service.repository.get_action_form_by_action_definition",
            return_value=SimpleNamespace(id=uuid4()),
        ),
    ):
        with pytest.raises(HTTPException) as exc:
            action_form_service.create_action_form(
                db,
                1,
                object_type_id,
                action.id,
                ActionFormCreate(title="Создать задачу"),
            )

    assert exc.value.status_code == 409


def test_publish_snapshot_includes_action_form() -> None:
    object_type = SimpleNamespace(
        id=uuid4(),
        key="tasks",
        name="Задачи",
        description=None,
        icon=None,
        icon_type=None,
        icon_file_url=None,
        color=None,
        sort_order=0,
        status="active",
        is_system=False,
        is_default_entity=False,
        settings_json={},
        governance_json={},
    )
    action = SimpleNamespace(
        id=uuid4(),
        object_type_id=object_type.id,
        key="create_task",
        name="Создать задачу",
        description=None,
        action_type_key="create_record",
        is_active=True,
    )
    title_field = _field_definition(object_type_id=object_type.id, key="title")
    action_form = SimpleNamespace(
        id=uuid4(),
        action_definition_id=action.id,
        object_type_id=object_type.id,
        title="Создать задачу",
        description=None,
        submit_label="Создать",
        cancel_label="Отмена",
        is_active=True,
    )
    action_form_field = SimpleNamespace(
        id=uuid4(),
        action_form_id=action_form.id,
        field_definition_id=title_field.id,
        label_override=None,
        placeholder=None,
        help_text=None,
        required=True,
        sort_order=10,
        is_visible=True,
    )

    payload = build_snapshot_payload(
        tenant_id=1,
        catalog_version=1,
        catalog=TenantDraftCatalog(
            object_types=[object_type],
            fields=[title_field],
            views=[],
            relations=[],
            actions=[action],
            placements=[
                SimpleNamespace(
                    id=uuid4(),
                    action_definition_id=action.id,
                    object_type_id=object_type.id,
                    placement_key="top_panel",
                    is_active=True,
                    sort_order=10,
                    label_override=None,
                    icon_key=None,
                    config_json={},
                ),
            ],
            action_forms=[action_form],
            action_form_fields=[action_form_field],
        ),
    )

    published_action = payload["object_types"][0]["actions"][0]
    assert "form" in published_action
    assert published_action["form"]["title"] == "Создать задачу"
    assert published_action["form"]["fields"][0]["field_key"] == "title"
    assert published_action["form"]["fields"][0]["required"] is True


def test_runtime_resolver_includes_form() -> None:
    actions = [
        {
            "id": str(uuid4()),
            "key": "create_task",
            "name": "Создать задачу",
            "description": None,
            "action_type_key": "create_record",
            "is_active": True,
            "version": 1,
            "config_json": {},
            "placements": [
                {
                    "id": str(uuid4()),
                    "placement_key": "top_panel",
                    "is_active": True,
                    "sort_order": 10,
                    "label_override": None,
                    "icon_key": None,
                    "config_json": {},
                },
            ],
            "form": {
                "title": "Создать задачу",
                "submit_label": "Создать",
                "cancel_label": "Отмена",
                "fields": [
                    {
                        "field_key": "title",
                        "required": True,
                        "sort_order": 10,
                        "is_visible": True,
                    },
                ],
            },
        },
    ]

    resolved = resolve_actions_for_placement(actions, "top_panel")

    assert len(resolved) == 1
    assert resolved[0].form is not None
    assert resolved[0].form.title == "Создать задачу"
    assert resolved[0].form.fields[0].field_key == "title"
