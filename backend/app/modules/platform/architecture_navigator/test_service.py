from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.models import ArchitectureComponent


def _component(**overrides):
    base = dict(
        id=1,
        component_key="dev-environment",
        technical_name="DEV",
        component_type="contour",
        category_key="contours",
        title="Среда разработки",
        description="desc",
        purpose="purpose",
        parent_key=None,
        sort_order=20,
        catalog_sources=["catalog_seed"],
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def test_scan_info_from_latest_without_scan():
    info = service._scan_info_from_latest(None)
    assert info.scan_id is None
    assert info.scanned_at is None
    assert info.scanner_version is None


def test_scan_info_from_latest_uses_started_at_when_finished_missing():
    started_at = datetime(2026, 6, 18, 10, 0, 0)
    scan = SimpleNamespace(
        id=7,
        finished_at=None,
        started_at=started_at,
        scanner_version="1.0.0",
    )
    info = service._scan_info_from_latest(scan)
    assert info.scan_id == 7
    assert info.scanned_at == started_at
    assert info.scanner_version == "1.0.0"


def test_get_component_card_handles_missing_scan(monkeypatch):
    component = _component()

    class _Query:
        def order_by(self, *_args, **_kwargs):
            return self

        def first(self):
            return None

    class _FakeSession:
        def query(self, model):
            if model is ArchitectureComponent:
                return _ComponentQuery(component)
            return _Query()

    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)
    card = service.get_component_card(_FakeSession(), "dev-environment")
    assert card.key == "dev-environment"
    assert card.last_scan.scan_id is None
    assert card.backend_files == []


class _ComponentQuery:
    def __init__(self, component):
        self._component = component

    def filter(self, *_args, **_kwargs):
        return self

    def one_or_none(self):
        return self._component


@pytest.mark.parametrize(
    "component_key",
    [
        "control-plane",
        "dev-environment",
        "template-environment",
        "client-environment",
        "studio",
        "platform-modal",
        "platform-page",
        "avatar",
        "notification-center",
    ],
)
def test_get_component_card_seed_keys(component_key, monkeypatch):
    rows = {
        row["component_key"]: _component(
            component_key=row["component_key"],
            technical_name=row["technical_name"],
            component_type=row["component_type"],
            category_key=row["category_key"],
            title=row["title"],
            sort_order=row.get("sort_order", 0),
        )
        for row in service.CATALOG_COMPONENTS
    }
    component = rows[component_key]

    class _FakeSession:
        def query(self, model):
            if model is ArchitectureComponent:
                return _ComponentQuery(component)
            return _ScanQuery()

    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)

    card = service.get_component_card(_FakeSession(), component_key)
    assert card.key == component_key
    assert card.title == component.title


class _ScanQuery:
    def order_by(self, *_args, **_kwargs):
        return self

    def first(self):
        return None
