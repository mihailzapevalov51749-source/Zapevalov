"""Public URL slug helpers (hyphenated, user-facing)."""

from __future__ import annotations

import re

from app.shared.platform_keys import transliterate_platform_key

PUBLIC_SLUG_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")

RESERVED_PUBLIC_SLUGS = frozenset({
    "login",
    "designer",
    "portal",
    "control-plane",
    "yasii",
    "onlyoffice-test",
    "dev",
    "tasks",
    "admin",
    "api",
    "static",
    "assets",
    "favicon.ico",
})


def normalize_public_slug(value: str | None) -> str:
    return str(value or "").strip().lower()


def slugify_public_slug(name: str) -> str:
    transliterated = transliterate_platform_key(name)
    slug = re.sub(r"[^a-z0-9]+", "-", transliterated)
    slug = re.sub(r"-+", "-", slug).strip("-")
    if not slug:
        return "company"
    if len(slug) > 63:
        slug = slug[:63].rstrip("-")
    return slug or "company"


def is_valid_public_slug(value: str) -> bool:
    normalized = normalize_public_slug(value)
    if not normalized or not PUBLIC_SLUG_PATTERN.match(normalized):
        return False
    return normalized not in RESERVED_PUBLIC_SLUGS


def validate_public_slug_or_raise(value: str) -> str:
    normalized = normalize_public_slug(value)
    if not normalized:
        raise ValueError("Публичный адрес обязателен")
    if not PUBLIC_SLUG_PATTERN.match(normalized):
        raise ValueError(
            "Публичный адрес может содержать только латинские буквы, цифры и дефис"
        )
    if normalized in RESERVED_PUBLIC_SLUGS:
        raise ValueError("Выбранный публичный адрес зарезервирован системой")
    return normalized
