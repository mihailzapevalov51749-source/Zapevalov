"""Tests for module settings_schema MVP."""

from __future__ import annotations

import copy
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.platform_modules.settings_schema import (
    SettingsSchemaValidationError,
    count_schema_fields,
    get_module_settings_schema,
    list_active_module_settings_schemas,
    validate_settings_schema,
)
from app.modules.platform_modules.settings_schema.calendar_schema import (
    build_runtime_calendar_settings_schema,
)
from app.modules.users.models import Role, User


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _ensure_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role


def _create_user(db: Session, *, role_name: str) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"settings_schema_test_{role_name}_{_suffix()}@test.local",
        full_name=f"Settings Schema Test {role_name}",
        hashed_password="hash",
        is_active=True,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def test_schema_envelope_valid_for_active_modules() -> None:
    schemas = list_active_module_settings_schemas()
    assert set(schemas.keys()) == {
        "runtime.chat",
        "runtime.calendar",
        "runtime.notifications",
    }

    for module_key, schema in schemas.items():
        validate_settings_schema(schema, expected_module_key=module_key)
        assert schema["schema_version"] == "1.0.0"
        assert set(schema["blocks"].keys()) == {
            "settings",
            "permissions",
            "views",
            "rules",
            "templates",
        }


def test_calendar_schema_valid() -> None:
    schema = get_module_settings_schema("runtime.calendar")
    assert schema is not None
    validate_settings_schema(schema, expected_module_key="runtime.calendar")

    counts = count_schema_fields(schema)
    assert counts["settings"] == 9
    assert counts["permissions"] == 7
    assert counts["views"] == 4
    assert counts["rules"] == 4
    assert counts["templates"] == 4


def test_chat_schema_valid() -> None:
    schema = get_module_settings_schema("runtime.chat")
    assert schema is not None
    validate_settings_schema(schema, expected_module_key="runtime.chat")

    counts = count_schema_fields(schema)
    assert counts["settings"] == 10
    assert counts["permissions"] == 9
    assert counts["views"] == 4
    assert counts["rules"] == 6
    assert counts["templates"] == 3


def test_notifications_schema_valid() -> None:
    schema = get_module_settings_schema("runtime.notifications")
    assert schema is not None
    validate_settings_schema(schema, expected_module_key="runtime.notifications")

    counts = count_schema_fields(schema)
    assert counts["settings"] == 9
    assert counts["permissions"] == 5
    assert counts["views"] == 4
    assert counts["rules"] == 4
    assert counts["templates"] == 2


def test_validator_rejects_invalid_schema() -> None:
    with pytest.raises(SettingsSchemaValidationError):
        validate_settings_schema({})

    with pytest.raises(SettingsSchemaValidationError):
        validate_settings_schema({"schema_version": "1.0.0", "module_key": "runtime.chat"})


def test_validator_rejects_duplicate_template_keys() -> None:
    schema = copy.deepcopy(build_runtime_calendar_settings_schema())
    schema["blocks"]["templates"]["seed_catalog"].append(
        {
            "seed_key": "calendar.meeting",
            "kind": "event_preset",
            "description": "duplicate",
            "payload": {},
        }
    )

    with pytest.raises(SettingsSchemaValidationError, match="duplicate template seed_key"):
        validate_settings_schema(schema, expected_module_key="runtime.calendar")


def test_validation_rules_working_hours_timezone_retention_participants() -> None:
    schema = copy.deepcopy(build_runtime_calendar_settings_schema())

    schema["blocks"]["settings"]["defaults"]["working_hours"] = {
        "start": "18:00",
        "end": "09:00",
    }
    with pytest.raises(SettingsSchemaValidationError, match="start < end"):
        validate_settings_schema(schema, expected_module_key="runtime.calendar")

    schema = copy.deepcopy(build_runtime_calendar_settings_schema())
    schema["blocks"]["settings"]["defaults"]["timezone"] = "!!!"
    with pytest.raises(SettingsSchemaValidationError, match="IANA timezone"):
        validate_settings_schema(schema, expected_module_key="runtime.calendar")

    chat_schema = get_module_settings_schema("runtime.chat")
    assert chat_schema is not None
    invalid_chat = copy.deepcopy(chat_schema)
    invalid_chat["blocks"]["settings"]["defaults"]["retention_days"] = 0
    with pytest.raises(SettingsSchemaValidationError, match="between 1 and 3650"):
        validate_settings_schema(invalid_chat, expected_module_key="runtime.chat")

    invalid_chat = copy.deepcopy(chat_schema)
    invalid_chat["blocks"]["settings"]["defaults"]["max_participants_per_chat"] = 1
    with pytest.raises(SettingsSchemaValidationError, match="between 2 and 500"):
        validate_settings_schema(invalid_chat, expected_module_key="runtime.chat")

    invalid_calendar = copy.deepcopy(build_runtime_calendar_settings_schema())
    invalid_calendar["blocks"]["settings"]["defaults"]["enabled_event_types"] = ["unknown_type"]
    with pytest.raises(SettingsSchemaValidationError, match="invalid items"):
        validate_settings_schema(invalid_calendar, expected_module_key="runtime.calendar")


def test_manifest_seed_contains_settings_schema(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    for module_key in ("runtime.chat", "runtime.calendar", "runtime.notifications"):
        schema = get_module_settings_schema(module_key)
        assert schema is not None
        validate_settings_schema(schema, expected_module_key=module_key)


def test_settings_schema_api(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    seed_platform_module_manifests(db, commit=True)

    admin = _create_user(db, role_name="admin")
    db.commit()

    response = client.get(
        "/platform/modules/runtime.calendar/settings-schema",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["module_key"] == "runtime.calendar"
    assert payload["schema_version"] == "1.0.0"
    assert "settings" in payload["blocks"]
    validate_settings_schema(payload, expected_module_key="runtime.calendar")


def test_existing_manifests_only_schema_changed(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    for module_key in ("runtime.chat", "runtime.calendar", "runtime.notifications"):
        schema = get_module_settings_schema(module_key)
        assert schema
        assert schema["blocks"]["settings"]["fields"]


def test_runtime_routing_contract_unchanged() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    portal_page_view = (
        repo_root / "frontend" / "src" / "portal" / "PortalPageView.jsx"
    ).read_text(encoding="utf-8")

    assert "CorporateChatPage" in portal_page_view
    assert "CorporateCalendarPage" in portal_page_view
    assert "resolveIsCorporateChatPage" in portal_page_view
    assert "resolveIsCorporateCalendarPage" in portal_page_view


def test_control_plane_schema_api_client_exists() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    api_source = (
        repo_root / "frontend" / "src" / "modules" / "controlPlane" / "api" / "platformModulesApi.js"
    ).read_text(encoding="utf-8")
    page_source = (
        repo_root
        / "frontend"
        / "src"
        / "modules"
        / "controlPlane"
        / "pages"
        / "PlatformModulesPage.jsx"
    ).read_text(encoding="utf-8")

    assert "getPlatformModuleSettingsSchema" in api_source
    assert "SettingsSchemaPanel" in page_source
    assert "settings-schema" in api_source
