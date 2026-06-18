"""Unit tests for backend Environment Guard."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine

from app.core.environment_guard import (
    LEGACY_DATABASE_NAME,
    EnvironmentGuardError,
    ENVIRONMENT_MATRIX,
    extract_database_name,
    normalize_app_env,
    resolve_raw_app_env,
    run_environment_guard,
    validate_database_url_match,
    validate_legacy_database_blocked,
    validate_portal_identity,
)


@pytest.mark.parametrize(
    ("env", "expected"),
    [
        ({"YASNOPRO_ENV": "DEV", "APP_ENV": "TEMPLATE", "ENVIRONMENT": "CLIENT"}, "DEV"),
        ({"YASNOPRO_ENV": None, "APP_ENV": "TEMPLATE", "ENVIRONMENT": "CLIENT"}, "TEMPLATE"),
        ({"YASNOPRO_ENV": None, "APP_ENV": None, "ENVIRONMENT": "CLIENT"}, "CLIENT"),
        ({"YASNOPRO_ENV": None, "APP_ENV": None, "ENVIRONMENT": "DEMO_CLIENT"}, "DEMO_CLIENT"),
    ],
)
def test_resolve_raw_app_env_priority(env: dict[str, str | None], expected: str) -> None:
    assert resolve_raw_app_env(env) == expected


@pytest.mark.parametrize(
    ("raw", "canonical"),
    [
        ("DEV", "DEV"),
        ("dev", "DEV"),
        ("TEMPLATE", "TEMPLATE"),
        ("CLIENT", "CLIENT"),
        ("DEMO_CLIENT", "CLIENT"),
        ("demo_client", "CLIENT"),
    ],
)
def test_normalize_app_env_positive(raw: str, canonical: str) -> None:
    assert normalize_app_env(raw) == canonical


def test_normalize_app_env_missing() -> None:
    with pytest.raises(EnvironmentGuardError, match="APP_ENV/YASNOPRO_ENV is not set"):
        normalize_app_env(None)


def test_normalize_app_env_unknown() -> None:
    with pytest.raises(EnvironmentGuardError, match="Unexpected value"):
        normalize_app_env("production")


@pytest.mark.parametrize(
    ("database_url", "expected"),
    [
        (
            "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_dev",
            "yasnopro_dev",
        ),
        (
            "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_template",
            "yasnopro_template",
        ),
        (
            "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_client?sslmode=disable",
            "yasnopro_client",
        ),
    ],
)
def test_extract_database_name(database_url: str, expected: str) -> None:
    assert extract_database_name(database_url) == expected


@pytest.mark.parametrize(
    ("app_env", "database_url"),
    [
        ("DEV", "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_dev"),
        ("TEMPLATE", "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_template"),
        ("CLIENT", "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_client"),
    ],
)
def test_validate_database_url_match_positive(app_env: str, database_url: str) -> None:
    database_name = validate_database_url_match(app_env=app_env, database_url=database_url)
    assert database_name == ENVIRONMENT_MATRIX[app_env].database


@pytest.mark.parametrize(
    ("app_env", "database_url"),
    [
        ("DEV", "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_template"),
        ("TEMPLATE", "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_dev"),
        ("CLIENT", "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_dev"),
        ("CLIENT", "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_template"),
    ],
)
def test_validate_database_url_match_negative(app_env: str, database_url: str) -> None:
    with pytest.raises(EnvironmentGuardError, match="expects database"):
        validate_database_url_match(app_env=app_env, database_url=database_url)


def test_validate_legacy_database_blocked() -> None:
    legacy_url = f"postgresql://portal_user:portal_pass@localhost:5434/{LEGACY_DATABASE_NAME}"
    with pytest.raises(EnvironmentGuardError, match="Legacy database"):
        validate_database_url_match(app_env="DEV", database_url=legacy_url)


def test_validate_portal_identity_positive() -> None:
    engine = create_engine("sqlite:///:memory:")
    portal_id, environment_role = validate_portal_identity(
        app_env="DEV",
        engine=engine,
        portal_row=(1, "DEV"),
    )
    assert portal_id == 1
    assert environment_role == "DEV"


@pytest.mark.parametrize(
    ("app_env", "portal_row", "pattern"),
    [
        ("DEV", (2, "DEV"), "expects portal.id=1"),
        ("TEMPLATE", (2, "DEV"), "expects environment_role=TEMPLATE"),
        ("CLIENT", (21, "CLIENT"), "expects environment_role=DEMO_CLIENT"),
    ],
)
def test_validate_portal_identity_negative(
    app_env: str,
    portal_row: tuple[int, str] | None,
    pattern: str,
) -> None:
    engine = MagicMock()
    with pytest.raises(EnvironmentGuardError, match=pattern):
        validate_portal_identity(app_env=app_env, engine=engine, portal_row=portal_row)


def test_validate_portal_identity_missing_portal() -> None:
    engine = MagicMock()
    connection = MagicMock()
    connection.execute.return_value.fetchone.return_value = None
    engine.connect.return_value.__enter__.return_value = connection

    with pytest.raises(EnvironmentGuardError, match="Portal id=1 not found"):
        validate_portal_identity(app_env="DEV", engine=engine)


def test_run_environment_guard_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("YASNOPRO_SKIP_ENVIRONMENT_GUARD", raising=False)
    engine = MagicMock()
    connection = MagicMock()
    connection.execute.return_value.fetchone.return_value = (1, "DEV")
    engine.connect.return_value.__enter__.return_value = connection

    result = run_environment_guard(
        engine=engine,
        database_url="postgresql://portal_user:portal_pass@localhost:5434/yasnopro_dev",
        env={"YASNOPRO_ENV": "DEV", "APP_ENV": None, "ENVIRONMENT": None},
    )

    assert result == {
        "app_env": "DEV",
        "database": "yasnopro_dev",
        "portal_id": 1,
        "environment_role": "DEV",
    }


def test_run_environment_guard_missing_app_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("YASNOPRO_SKIP_ENVIRONMENT_GUARD", raising=False)
    with pytest.raises(EnvironmentGuardError, match="APP_ENV/YASNOPRO_ENV is not set"):
        run_environment_guard(
            engine=MagicMock(),
            database_url="postgresql://portal_user:portal_pass@localhost:5434/yasnopro_dev",
            env={"YASNOPRO_ENV": None, "APP_ENV": None, "ENVIRONMENT": None},
        )


def test_run_environment_guard_skipped(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")
    assert run_environment_guard() is None
