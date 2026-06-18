"""Technical database naming for isolated company runtimes."""

from __future__ import annotations

import re

from app.modules.company_database_provisioning.constants import (
    COMPANY_DATABASE_MAX_LENGTH,
    COMPANY_DATABASE_PREFIX,
)
from app.shared.platform_keys import is_valid_platform_key

_INVALID_DB_CHARS = re.compile(r"[^a-z0-9_]+")


def normalize_company_database_suffix(company_code: str) -> str:
    normalized = str(company_code or "").strip().lower()
    normalized = _INVALID_DB_CHARS.sub("_", normalized)
    normalized = normalized.strip("_")
    if not normalized:
        raise ValueError("company_code is required for database naming")
    if not is_valid_platform_key(normalized):
        raise ValueError("company_code must be a valid platform key")
    return normalized


def build_company_database_name(company_code: str) -> str:
    suffix = normalize_company_database_suffix(company_code)
    database_name = f"{COMPANY_DATABASE_PREFIX}{suffix}"
    if len(database_name) > COMPANY_DATABASE_MAX_LENGTH:
        raise ValueError("company database name exceeds PostgreSQL limit")
    return database_name


def is_company_runtime_database(database_name: str | None) -> bool:
    normalized = str(database_name or "").strip().lower()
    return normalized.startswith(COMPANY_DATABASE_PREFIX)
