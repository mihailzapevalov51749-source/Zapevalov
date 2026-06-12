"""Platform key helpers (field keys, tenant codes, view keys)."""

from __future__ import annotations

import re

PLATFORM_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,63}$")

CYRILLIC_TO_LATIN = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}


def transliterate_platform_key(value: str) -> str:
    return "".join(
        CYRILLIC_TO_LATIN.get(char, char)
        for char in str(value or "").strip().lower()
    )


def slugify_platform_key(name: str) -> str:
    transliterated = transliterate_platform_key(name)
    slug = re.sub(r"[^a-z0-9]+", "_", transliterated)
    slug = re.sub(r"^_+|_+$", "", slug)
    return re.sub(r"_+", "_", slug)


def generate_platform_key(name: str, existing_keys: list[str] | None = None) -> str:
    used = {str(item or "").strip() for item in (existing_keys or []) if str(item or "").strip()}

    base = slugify_platform_key(name)
    if not base or len(base) < 3 or not base[0].isalpha():
        base = "tenant"

    if len(base) > 63:
        base = base[:63].rstrip("_")

    candidate = base
    counter = 2
    while candidate in used:
        suffix = f"_{counter}"
        trimmed = base[: max(3, 63 - len(suffix))].rstrip("_")
        candidate = f"{trimmed}{suffix}"
        counter += 1

    if not PLATFORM_KEY_PATTERN.match(candidate):
        candidate = "tenant"
        while candidate in used:
            candidate = f"tenant_{counter}"
            counter += 1

    return candidate


def is_valid_platform_key(value: str) -> bool:
    return bool(PLATFORM_KEY_PATTERN.match(str(value or "").strip()))
