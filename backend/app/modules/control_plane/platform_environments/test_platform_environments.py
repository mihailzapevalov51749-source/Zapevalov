from unittest.mock import MagicMock

from app.modules.control_plane.platform_environments.service import (
    get_platform_environment,
    list_platform_environments,
)


def _portal_stub(*, portal_id: int, tenant_status: str = "ACTIVE"):
    portal = MagicMock()
    portal.id = portal_id
    portal.tenant_status = tenant_status
    return portal


def test_list_platform_environments_returns_three_slots(monkeypatch) -> None:
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = [
        _portal_stub(portal_id=1),
    ]

    version_row = MagicMock()
    version_row.tenant_id = 1
    version_row.platform_version = "1.0.0-dev"
    version_row.installed_at = None

    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.service.version_crud.list_current_versions",
        lambda _db: [version_row],
    )
    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.service._resolve_current_app_env",
        lambda: "DEV",
    )

    items = list_platform_environments(db)

    assert len(items) == 3
    assert [item.id for item in items] == [1, 2, 21]
    assert [item.environment_key for item in items] == ["DEV", "TEMPLATE", "CLIENT"]
    assert items[0].is_current_environment is True
    assert items[1].status == "—"
    assert items[0].database_name == "yasnopro_dev"
    assert items[1].database_name == "yasnopro_template"
    assert items[2].database_name == "yasnopro_client"


def test_get_platform_environment_detail_for_dev(monkeypatch) -> None:
    db = MagicMock()
    portal = _portal_stub(portal_id=1)
    db.query.return_value.filter.return_value.one_or_none.return_value = portal

    version_row = MagicMock()
    version_row.platform_version = "1.0.0-dev"
    version_row.installed_at = None

    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.service.version_crud.get_current_version_for_tenant",
        lambda _db, tenant_id: version_row if tenant_id == 1 else None,
    )
    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.service._resolve_last_release",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.service._resolve_current_app_env",
        lambda: "DEV",
    )

    item = get_platform_environment(db, portal_id=1)

    assert item is not None
    assert item.environment_key == "DEV"
    assert item.current_version == "1.0.0-dev"
    assert item.backend_port == 8010
    assert item.frontend_port == 5173


def test_get_platform_environment_unknown_portal() -> None:
    db = MagicMock()
    assert get_platform_environment(db, portal_id=999) is None
