from datetime import datetime, timedelta

from app.modules.platform_dashboard.models import PlatformDashboardMeta
from app.modules.platform_dashboard.service import (
    _resolve_dashboard_last_updated,
    build_dashboard_freshness,
)
from app.modules.platform_dashboard_analyzer.fingerprint import compute_analyzer_fingerprint


class _ScalarQuery:
    def __init__(self, value):
        self._value = value

    def filter(self, *args, **kwargs):
        return self

    def scalar(self):
        return self._value


class _FakeSession:
    def __init__(self, values):
        self._values = values
        self._index = 0

    def query(self, *_args, **_kwargs):
        value = self._values[self._index]
        self._index += 1
        return _ScalarQuery(value)


class _MetaQuery:
    def __init__(self, meta):
        self._meta = meta

    def filter(self, *args, **kwargs):
        return self

    def one_or_none(self):
        return self._meta


class _FreshnessSession:
    def __init__(self, meta):
        self._meta = meta

    def query(self, model):
        assert model is PlatformDashboardMeta
        return _MetaQuery(self._meta)


def test_resolve_dashboard_last_updated_prefers_latest_refresh():
    refresh_time = datetime(2026, 5, 30, 14, 42, 0)
    older_time = refresh_time - timedelta(hours=2)

    db = _FakeSession([older_time, older_time, older_time, refresh_time])

    assert _resolve_dashboard_last_updated(db) == refresh_time


def test_build_dashboard_freshness_marks_stale_when_hash_differs():
    fingerprint = compute_analyzer_fingerprint()
    meta = PlatformDashboardMeta(
        id=1,
        analyzer_version=fingerprint.version,
        analyzer_hash="outdated-hash",
        refreshed_at=datetime(2026, 5, 30, 12, 0, 0),
    )

    freshness = build_dashboard_freshness(_FreshnessSession(meta))

    assert freshness.is_stale is True
    assert freshness.analyzer_hash == "outdated-hash"
    assert freshness.current_analyzer_hash == fingerprint.hash


def test_build_dashboard_freshness_is_fresh_after_matching_refresh():
    fingerprint = compute_analyzer_fingerprint()
    meta = PlatformDashboardMeta(
        id=1,
        analyzer_version=fingerprint.version,
        analyzer_hash=fingerprint.hash,
        refreshed_at=datetime(2026, 5, 30, 17, 19, 0),
    )

    freshness = build_dashboard_freshness(_FreshnessSession(meta))

    assert freshness.is_stale is False
    assert freshness.refreshed_at == meta.refreshed_at
