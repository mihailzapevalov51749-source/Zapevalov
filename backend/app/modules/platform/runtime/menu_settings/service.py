from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform.runtime.menu_settings.key_resolution import (
    build_nav_id_alias_map,
    resolve_canonical_item_key,
    resolve_tenant_menu_settings_aliases,
)
from app.modules.platform.runtime.menu_settings.models import TenantRuntimeMenuSetting, UserMenuPreference
from app.modules.platform.runtime.menu_settings.schemas import (
    TenantRuntimeMenuSettingRead,
    TenantRuntimeMenuSettingUpsert,
    UserMenuPreferenceRead,
    UserMenuPreferenceUpsert,
)
from app.modules.publication_guard.structure_write_service_guard import guard_direct_structure_write


def actor_user_id(user) -> int:
    return int(user.id)


def normalize_item_key(item_key: str) -> str:
    normalized = str(item_key or "").strip()
    if not normalized:
        raise ValueError("item_key is required")
    return normalized


def _serialize_tenant_row(row: TenantRuntimeMenuSetting) -> TenantRuntimeMenuSettingRead:
    return TenantRuntimeMenuSettingRead(
        item_key=row.item_key,
        navigation_item_id=row.navigation_item_id,
        title=row.title,
        icon=row.icon,
        icon_type=row.icon_type,
        icon_file_url=row.icon_file_url,
        color=row.color,
        sort_order=row.sort_order,
        is_visible=row.is_visible,
        is_bold=row.is_bold,
        is_italic=row.is_italic,
        is_expanded=row.is_expanded,
        block_id=row.block_id,
        updated_at=row.updated_at,
    )


def _serialize_user_row(row: UserMenuPreference) -> UserMenuPreferenceRead:
    return UserMenuPreferenceRead(
        item_key=row.item_key,
        navigation_item_id=row.navigation_item_id,
        sort_order=row.sort_order,
        is_hidden=row.is_hidden,
        color=row.color,
        is_bold=row.is_bold,
        is_collapsed=row.is_collapsed,
        personal_block_key=row.personal_block_key,
        updated_at=row.updated_at,
    )


def _list_tenant_runtime_menu_settings_raw(
    db: Session,
    tenant_id: int,
) -> dict[str, TenantRuntimeMenuSettingRead]:
    rows = (
        db.query(TenantRuntimeMenuSetting)
        .filter(TenantRuntimeMenuSetting.tenant_id == tenant_id)
        .order_by(TenantRuntimeMenuSetting.sort_order.asc(), TenantRuntimeMenuSetting.item_key.asc())
        .all()
    )
    return {row.item_key: _serialize_tenant_row(row) for row in rows}


def list_tenant_runtime_menu_settings(
    db: Session,
    tenant_id: int,
) -> dict[str, TenantRuntimeMenuSettingRead]:
    raw = _list_tenant_runtime_menu_settings_raw(db, tenant_id)
    return resolve_tenant_menu_settings_aliases(db, tenant_id, raw)


def _apply_tenant_patch(row: TenantRuntimeMenuSetting, payload: TenantRuntimeMenuSettingUpsert) -> None:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(row, field, value)


def upsert_tenant_runtime_menu_setting(
    db: Session,
    *,
    tenant_id: int,
    item_key: str,
    payload: TenantRuntimeMenuSettingUpsert,
) -> TenantRuntimeMenuSettingRead:
    guard_direct_structure_write(db, tenant_id, "upsert_tenant_runtime_menu_setting")
    alias_by_nav_id = build_nav_id_alias_map(db, tenant_id)
    normalized_key = resolve_canonical_item_key(
        normalize_item_key(item_key),
        alias_by_nav_id=alias_by_nav_id,
    )
    row = (
        db.query(TenantRuntimeMenuSetting)
        .filter(
            TenantRuntimeMenuSetting.tenant_id == tenant_id,
            TenantRuntimeMenuSetting.item_key == normalized_key,
        )
        .one_or_none()
    )

    if row is None:
        row = TenantRuntimeMenuSetting(
            tenant_id=tenant_id,
            item_key=normalized_key,
        )
        db.add(row)

    _apply_tenant_patch(row, payload)
    db.flush()
    db.refresh(row)
    return _serialize_tenant_row(row)


def bulk_upsert_tenant_runtime_menu_settings(
    db: Session,
    *,
    tenant_id: int,
    settings: dict[str, TenantRuntimeMenuSettingUpsert],
) -> dict[str, TenantRuntimeMenuSettingRead]:
    guard_direct_structure_write(db, tenant_id, "bulk_upsert_tenant_runtime_menu_settings")
    for item_key, payload in settings.items():
        upsert_tenant_runtime_menu_setting(
            db,
            tenant_id=tenant_id,
            item_key=item_key,
            payload=payload,
        )
    return list_tenant_runtime_menu_settings(db, tenant_id)


def clone_tenant_runtime_menu_settings(
    db: Session,
    *,
    source_tenant_id: int,
    target_tenant_id: int,
    bypass_write_policy: bool = False,
) -> int:
    guard_direct_structure_write(
        db,
        target_tenant_id,
        "clone_tenant_runtime_menu_settings",
        bypass_write_policy=bypass_write_policy,
    )
    rows = (
        db.query(TenantRuntimeMenuSetting)
        .filter(TenantRuntimeMenuSetting.tenant_id == source_tenant_id)
        .order_by(TenantRuntimeMenuSetting.id.asc())
        .all()
    )

    count = 0
    for row in rows:
        db.add(
            TenantRuntimeMenuSetting(
                tenant_id=target_tenant_id,
                item_key=row.item_key,
                navigation_item_id=row.navigation_item_id,
                title=row.title,
                icon=row.icon,
                icon_type=row.icon_type,
                icon_file_url=row.icon_file_url,
                color=row.color,
                sort_order=row.sort_order,
                is_visible=row.is_visible,
                is_bold=row.is_bold,
                is_italic=row.is_italic,
                is_expanded=row.is_expanded,
                block_id=row.block_id,
            )
        )
        count += 1

    if count:
        db.flush()

    return count


def list_user_menu_preferences(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> dict[str, UserMenuPreferenceRead]:
    rows = (
        db.query(UserMenuPreference)
        .filter(
            UserMenuPreference.tenant_id == tenant_id,
            UserMenuPreference.user_id == user_id,
        )
        .order_by(UserMenuPreference.sort_order.asc(), UserMenuPreference.item_key.asc())
        .all()
    )
    return {row.item_key: _serialize_user_row(row) for row in rows}


def _apply_user_patch(row: UserMenuPreference, payload: UserMenuPreferenceUpsert) -> None:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(row, field, value)


def upsert_user_menu_preference(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    item_key: str,
    payload: UserMenuPreferenceUpsert,
) -> UserMenuPreferenceRead:
    normalized_key = normalize_item_key(item_key)
    row = (
        db.query(UserMenuPreference)
        .filter(
            UserMenuPreference.tenant_id == tenant_id,
            UserMenuPreference.user_id == user_id,
            UserMenuPreference.item_key == normalized_key,
        )
        .one_or_none()
    )

    if row is None:
        row = UserMenuPreference(
            tenant_id=tenant_id,
            user_id=user_id,
            item_key=normalized_key,
        )
        db.add(row)

    _apply_user_patch(row, payload)
    db.flush()
    db.refresh(row)
    return _serialize_user_row(row)


def bulk_upsert_user_menu_preferences(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    preferences: dict[str, UserMenuPreferenceUpsert],
) -> dict[str, UserMenuPreferenceRead]:
    result: dict[str, UserMenuPreferenceRead] = {}
    for item_key, payload in preferences.items():
        result[item_key] = upsert_user_menu_preference(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            item_key=item_key,
            payload=payload,
        )
    return result


def reset_user_menu_preferences(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> int:
    deleted = (
        db.query(UserMenuPreference)
        .filter(
            UserMenuPreference.tenant_id == tenant_id,
            UserMenuPreference.user_id == user_id,
        )
        .delete(synchronize_session=False)
    )
    db.flush()
    return int(deleted or 0)
