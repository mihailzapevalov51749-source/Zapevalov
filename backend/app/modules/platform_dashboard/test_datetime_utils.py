from datetime import datetime, timezone

from app.modules.platform_dashboard.datetime_utils import ensure_utc, serialize_utc_datetime, utc_now


def test_utc_now_is_timezone_aware():
    now = utc_now()
    assert now.tzinfo == timezone.utc


def test_serialize_utc_datetime_appends_z_suffix():
    value = datetime(2026, 5, 30, 3, 40, tzinfo=timezone.utc)
    assert serialize_utc_datetime(value) == "2026-05-30T03:40:00Z"


def test_serialize_naive_datetime_as_utc():
    value = datetime(2026, 5, 30, 3, 40)
    assert serialize_utc_datetime(value) == "2026-05-30T03:40:00Z"


def test_ensure_utc_converts_naive_to_utc():
    value = ensure_utc(datetime(2026, 5, 30, 3, 40))
    assert value.tzinfo == timezone.utc
