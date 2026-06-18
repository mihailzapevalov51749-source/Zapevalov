"""Resolve legacy nav:{id} tenant menu setting keys to canonical system_key aliases."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_protected_pages import (
    resolve_system_key_for_runtime_protected_title,
)
from app.modules.platform.runtime.menu_settings.schemas import TenantRuntimeMenuSettingRead

NAV_LEGACY_KEY_RE = re.compile(r"^nav:(\d+)$", re.IGNORECASE)

MERGE_FIELD_NAMES = (
    "navigation_item_id",
    "title",
    "icon",
    "icon_type",
    "icon_file_url",
    "color",
    "sort_order",
    "is_visible",
    "is_bold",
    "is_italic",
    "is_expanded",
    "block_id",
)


def parse_nav_legacy_key(item_key: str) -> int | None:
    match = NAV_LEGACY_KEY_RE.match(str(item_key or "").strip())
    if not match:
        return None
    return int(match.group(1))


def build_nav_id_alias_map(db: Session, tenant_id: int) -> dict[int, str]:
    """Map navigation item id -> canonical system_key for alias resolution."""
    rows = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.deleted_at.is_(None),
        )
        .all()
    )

    alias_by_nav_id: dict[int, str] = {}

    for row in rows:
        nav_id = int(row.id)
        explicit_key = str(row.system_key or "").strip()
        if explicit_key:
            alias_by_nav_id[nav_id] = explicit_key
            continue

        derived_key = resolve_system_key_for_runtime_protected_title(row.title)
        if derived_key:
            alias_by_nav_id[nav_id] = derived_key

    return alias_by_nav_id


def resolve_canonical_item_key(
    item_key: str,
    *,
    alias_by_nav_id: dict[int, str],
) -> str:
    normalized = str(item_key or "").strip()
    if not normalized:
        return normalized

    nav_id = parse_nav_legacy_key(normalized)
    if nav_id is None:
        return normalized

    return alias_by_nav_id.get(nav_id, normalized)


def _field_value(record: Any, field: str) -> Any:
    if record is None:
        return None
    if isinstance(record, dict):
        return record.get(field)
    return getattr(record, field, None)


def _has_meaningful_value(field: str, value: Any) -> bool:
    if value is None:
        return False
    if field in {"icon_file_url", "title", "icon", "icon_type", "color"}:
        return bool(str(value).strip())
    return True


def merge_tenant_setting_records(
    primary: TenantRuntimeMenuSettingRead | dict[str, Any] | None,
    secondary: TenantRuntimeMenuSettingRead | dict[str, Any] | None,
    *,
    canonical_key: str,
) -> dict[str, Any]:
    """Merge two setting records without losing icon/sort/block fields."""
    merged: dict[str, Any] = {"item_key": canonical_key}

    for field in MERGE_FIELD_NAMES:
        primary_value = _field_value(primary, field)
        secondary_value = _field_value(secondary, field)

        if field == "sort_order":
            if (
                isinstance(primary_value, int)
                and isinstance(secondary_value, int)
                and primary_value == 0
                and secondary_value != 0
            ):
                merged[field] = secondary_value
            elif _has_meaningful_value(field, primary_value):
                merged[field] = primary_value
            elif _has_meaningful_value(field, secondary_value):
                merged[field] = secondary_value
            continue

        if _has_meaningful_value(field, primary_value):
            merged[field] = primary_value
        elif _has_meaningful_value(field, secondary_value):
            merged[field] = secondary_value

    primary_updated = _field_value(primary, "updated_at")
    secondary_updated = _field_value(secondary, "updated_at")
    if primary_updated is not None:
        merged["updated_at"] = primary_updated
    elif secondary_updated is not None:
        merged["updated_at"] = secondary_updated

    return merged


def resolve_tenant_menu_settings_aliases(
    db: Session,
    tenant_id: int,
    settings: dict[str, TenantRuntimeMenuSettingRead],
) -> dict[str, TenantRuntimeMenuSettingRead]:
    """Collapse nav:{id} keys into canonical system_key entries (read-time merge)."""
    if not settings:
        return {}

    alias_by_nav_id = build_nav_id_alias_map(db, tenant_id)
    grouped: dict[str, dict[str, TenantRuntimeMenuSettingRead | dict[str, Any]]] = {}

    for raw_key, record in settings.items():
        canonical_key = resolve_canonical_item_key(raw_key, alias_by_nav_id=alias_by_nav_id)
        bucket = grouped.setdefault(canonical_key, {})
        nav_id = parse_nav_legacy_key(raw_key)
        is_legacy_alias = nav_id is not None and canonical_key != raw_key

        if is_legacy_alias:
            bucket["legacy"] = record
        else:
            bucket["canonical"] = record

    resolved: dict[str, TenantRuntimeMenuSettingRead] = {}

    for canonical_key, parts in grouped.items():
        merged = merge_tenant_setting_records(
            parts.get("canonical"),
            parts.get("legacy"),
            canonical_key=canonical_key,
        )
        if not merged:
            continue

        nav_id = parse_nav_legacy_key(canonical_key)
        if nav_id is not None and "navigation_item_id" not in merged:
            merged["navigation_item_id"] = nav_id

        resolved[canonical_key] = TenantRuntimeMenuSettingRead.model_validate(merged)

    return resolved
