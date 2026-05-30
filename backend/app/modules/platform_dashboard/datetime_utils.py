from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def serialize_utc_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return ensure_utc(value).strftime("%Y-%m-%dT%H:%M:%SZ")
