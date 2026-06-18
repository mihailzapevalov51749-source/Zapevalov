"""Tests for platform environment launch service (WI-17)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.modules.control_plane.platform_environments.platform_environment_launch_service import (
    PlatformEnvironmentLaunchForbidden,
    build_template_environment_launch_context,
    resolve_environment_key_for_portal,
)


def test_resolve_environment_key_for_portal() -> None:
    assert resolve_environment_key_for_portal(1) == "DEV"
    assert resolve_environment_key_for_portal(2) == "TEMPLATE"
    assert resolve_environment_key_for_portal(21) == "CLIENT"
    assert resolve_environment_key_for_portal(999) is None


def test_build_template_environment_launch_context_success(monkeypatch) -> None:
    runtime_db = MagicMock()
    portal = MagicMock()
    portal.code = "platform_template"
    runtime_db.get.return_value = portal

    engine = MagicMock()

    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.platform_environment_launch_service.create_engine",
        lambda *_args, **_kwargs: engine,
    )
    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.platform_environment_launch_service.sessionmaker",
        lambda bind: lambda: runtime_db,
    )
    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.platform_environment_launch_service.resolve_tenant_home_page_id",
        lambda _db, portal_id: 347 if portal_id == 2 else None,
    )

    launch = build_template_environment_launch_context(portal_id=2)

    assert launch.environment_key == "TEMPLATE"
    assert launch.portal_id == 2
    assert launch.database_name == "yasnopro_template"
    assert launch.tenant_code == "platform_template"
    assert launch.home_page_id == 347
    assert launch.redirect_path == "/portal/2/page/347"
    assert launch.frontend_base_url == "http://localhost:5174"


@pytest.mark.parametrize("portal_id", [1, 21])
def test_build_template_environment_launch_context_rejects_non_template(portal_id: int) -> None:
    with pytest.raises(PlatformEnvironmentLaunchForbidden):
        build_template_environment_launch_context(portal_id=portal_id)
