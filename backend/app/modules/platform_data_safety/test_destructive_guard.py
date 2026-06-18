import pytest

from app.modules.platform_data_safety.destructive_guard import (
    DestructiveOperationBlocked,
    assert_platform_registry_reset_allowed,
    resolve_runtime_environment,
)


def test_resolve_runtime_environment_defaults_to_development(monkeypatch):
    monkeypatch.delenv("YASNOPRO_ENV", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    env = resolve_runtime_environment()
    assert env.name == "development"


def test_platform_registry_reset_blocked_in_demo(monkeypatch):
    monkeypatch.setenv("YASNOPRO_ENV", "demo")

    with pytest.raises(DestructiveOperationBlocked):
        assert_platform_registry_reset_allowed()
