"""Tenant environment types and statuses."""

from __future__ import annotations

from enum import StrEnum


class TenantType(StrEnum):
    DEV = "DEV"
    TEMPLATE = "TEMPLATE"
    DEMO = "DEMO"
    CLIENT = "CLIENT"
    LEGACY_TEMPLATE = "LEGACY_TEMPLATE"


class TenantStatus(StrEnum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"
    ARCHIVED = "ARCHIVED"


DEFAULT_TEMPLATE_VERSION = "1.0.0"

# Fallback when DB row has no tenant_type (legacy compatibility only).
LEGACY_TENANT_TYPE_BY_ID: dict[int, TenantType] = {
    1: TenantType.DEV,
    2: TenantType.TEMPLATE,
    3: TenantType.DEMO,
    13: TenantType.LEGACY_TEMPLATE,
}
