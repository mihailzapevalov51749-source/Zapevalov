from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform.designer.system_menu_settings.models import DesignerSystemMenuSetting
from app.modules.platform.designer.system_menu_settings.schemas import (
    DesignerSystemMenuSettingRead,
    DesignerSystemMenuSettingUpsert,
)
from app.modules.publication_guard.structure_write_service_guard import guard_direct_structure_write


def _serialize_row(row: DesignerSystemMenuSetting) -> DesignerSystemMenuSettingRead:
    return DesignerSystemMenuSettingRead(
        item_key=row.item_key,
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


def list_designer_system_menu_settings(
    db: Session,
    tenant_id: int,
) -> dict[str, DesignerSystemMenuSettingRead]:
    rows = (
        db.query(DesignerSystemMenuSetting)
        .filter(DesignerSystemMenuSetting.tenant_id == tenant_id)
        .order_by(DesignerSystemMenuSetting.sort_order.asc(), DesignerSystemMenuSetting.item_key.asc())
        .all()
    )
    return {row.item_key: _serialize_row(row) for row in rows}


def _apply_patch(row: DesignerSystemMenuSetting, payload: DesignerSystemMenuSettingUpsert) -> None:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(row, field, value)


def upsert_designer_system_menu_setting(
    db: Session,
    *,
    tenant_id: int,
    item_key: str,
    payload: DesignerSystemMenuSettingUpsert,
) -> DesignerSystemMenuSettingRead:
    guard_direct_structure_write(db, tenant_id, "upsert_designer_system_menu_setting")
    normalized_key = str(item_key or "").strip()
    if not normalized_key:
        raise ValueError("item_key is required")

    row = (
        db.query(DesignerSystemMenuSetting)
        .filter(
            DesignerSystemMenuSetting.tenant_id == tenant_id,
            DesignerSystemMenuSetting.item_key == normalized_key,
        )
        .one_or_none()
    )

    if row is None:
        row = DesignerSystemMenuSetting(
            tenant_id=tenant_id,
            item_key=normalized_key,
        )
        db.add(row)

    _apply_patch(row, payload)
    db.flush()
    db.refresh(row)
    return _serialize_row(row)


def bulk_upsert_designer_system_menu_settings(
    db: Session,
    *,
    tenant_id: int,
    settings: dict[str, DesignerSystemMenuSettingUpsert],
) -> dict[str, DesignerSystemMenuSettingRead]:
    guard_direct_structure_write(db, tenant_id, "bulk_upsert_designer_system_menu_settings")
    result: dict[str, DesignerSystemMenuSettingRead] = {}
    for item_key, payload in settings.items():
        result[item_key] = upsert_designer_system_menu_setting(
            db,
            tenant_id=tenant_id,
            item_key=item_key,
            payload=payload,
        )
    return result


def clone_designer_system_menu_settings(
    db: Session,
    *,
    source_tenant_id: int,
    target_tenant_id: int,
    bypass_write_policy: bool = False,
) -> int:
    guard_direct_structure_write(
        db,
        target_tenant_id,
        "clone_designer_system_menu_settings",
        bypass_write_policy=bypass_write_policy,
    )
    rows = (
        db.query(DesignerSystemMenuSetting)
        .filter(DesignerSystemMenuSetting.tenant_id == source_tenant_id)
        .order_by(DesignerSystemMenuSetting.id.asc())
        .all()
    )

    count = 0
    for row in rows:
        db.add(
            DesignerSystemMenuSetting(
                tenant_id=target_tenant_id,
                item_key=row.item_key,
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
