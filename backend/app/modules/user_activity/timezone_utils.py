from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TIMEZONE = "UTC"
UTC = timezone.utc


def resolve_timezone(name: str | None) -> ZoneInfo | timezone:
    if not name or name in {"UTC", "Etc/UTC", "Etc/GMT", "GMT"}:
        return UTC
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return UTC


def utc_now() -> datetime:
    return datetime.now(UTC)


def local_day_bounds(day: date, tz: ZoneInfo | timezone) -> tuple[datetime, datetime]:
    if tz is UTC:
        start = datetime(day.year, day.month, day.day, tzinfo=UTC)
        return start, start + timedelta(days=1)
    start_local = datetime(day.year, day.month, day.day, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def local_today(tz: ZoneInfo | timezone, *, now: datetime | None = None) -> date:
    current = (now or utc_now()).astimezone(tz)
    return current.date()


def to_local_date(value: datetime, tz: ZoneInfo | timezone) -> date:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(tz).date()
