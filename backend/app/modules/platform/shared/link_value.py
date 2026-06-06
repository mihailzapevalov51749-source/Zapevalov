"""Link field value validation and normalization."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

BLOCKED_SCHEMES = frozenset(
    {
        "javascript",
        "data",
        "vbscript",
        "file",
    },
)

ALLOWED_SCHEMES = frozenset(
    {
        "http",
        "https",
    },
)


def _extract_url(value: Any) -> str | None:
    if value is None:
        return None

    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None

    if isinstance(value, dict):
        for key in ("url", "href", "link"):
            raw = value.get(key)
            if raw is not None and str(raw).strip():
                return str(raw).strip()

    return None


def is_blocked_link_scheme(value: str) -> bool:
    normalized = str(value or "").strip().lower()

    for scheme in BLOCKED_SCHEMES:
        if normalized.startswith(f"{scheme}:"):
            return True

    return False


def validate_link_field_value(field_key: str, value: Any) -> None:
    if value is None:
        return

    url = _extract_url(value)

    if url is None:
        raise ValueError(f"Поле '{field_key}' ожидает URL string или null")

    if is_blocked_link_scheme(url):
        raise ValueError(f"Поле '{field_key}': недопустимая схема URL")

    if "://" in url:
        parsed = urlparse(url)
        scheme = (parsed.scheme or "").lower()

        if scheme not in ALLOWED_SCHEMES:
            raise ValueError(f"Поле '{field_key}': поддерживаются только http/https URL")


def normalize_link_field_value(value: Any) -> str | None:
    """Store link fields as trimmed URL strings."""
    url = _extract_url(value)

    if url is None:
        return None

    if is_blocked_link_scheme(url):
        raise ValueError("Недопустимая схема URL")

    return url
