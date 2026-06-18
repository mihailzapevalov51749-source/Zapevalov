"""Runtime enforcement helpers for integrated modules."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.tenant_module_configurations.runtime.service import get_runtime_settings


def get_calendar_runtime_settings(db: Session, *, tenant_id: int) -> dict:
    return get_runtime_settings(
        db,
        tenant_id=tenant_id,
        module_key="runtime.calendar",
    )


def get_chat_runtime_settings(db: Session, *, tenant_id: int | None) -> dict:
    return get_runtime_settings(
        db,
        tenant_id=tenant_id,
        module_key="runtime.chat",
    )


def get_notifications_runtime_settings(db: Session, *, tenant_id: int | None) -> dict:
    return get_runtime_settings(
        db,
        tenant_id=tenant_id,
        module_key="runtime.notifications",
    )


def assert_calendar_event_type_allowed(
    db: Session,
    *,
    tenant_id: int,
    event_type: str,
) -> None:
    settings = get_calendar_runtime_settings(db, tenant_id=tenant_id)
    enabled_types = settings.get("enabled_event_types")
    normalized = str(event_type or "").strip().lower()

    if isinstance(enabled_types, list) and enabled_types:
        allowed = {str(item).strip().lower() for item in enabled_types}
        if normalized not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Тип события отключён настройками компании",
            )


def assert_chat_attachments_allowed(db: Session, *, tenant_id: int | None, attachments: list) -> None:
    if not attachments:
        return

    settings = get_chat_runtime_settings(db, tenant_id=tenant_id)
    if settings.get("attachments_enabled") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вложения отключены настройками компании",
        )


def assert_chat_mentions_allowed(db: Session, *, tenant_id: int | None, mentions: list) -> None:
    if not mentions:
        return

    settings = get_chat_runtime_settings(db, tenant_id=tenant_id)
    if settings.get("mentions_enabled") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Упоминания отключены настройками компании",
        )


def assert_chat_reactions_allowed(db: Session, *, tenant_id: int | None) -> None:
    settings = get_chat_runtime_settings(db, tenant_id=tenant_id)
    if settings.get("reactions_enabled") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Реакции отключены настройками компании",
        )


def assert_chat_participant_limit(
    db: Session,
    *,
    tenant_id: int | None,
    current_count: int,
    incoming_count: int = 1,
) -> None:
    settings = get_chat_runtime_settings(db, tenant_id=tenant_id)
    max_participants = settings.get("max_participants_per_chat")
    if max_participants is None:
        return

    try:
        limit = int(max_participants)
    except (TypeError, ValueError):
        return

    if current_count + incoming_count > limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Достигнут лимит участников чата",
        )


def assert_chat_message_edit_allowed(
    db: Session,
    *,
    tenant_id: int | None,
    message_created_at: datetime | None,
) -> None:
    settings = get_chat_runtime_settings(db, tenant_id=tenant_id)
    window_minutes = settings.get("message_edit_window_minutes")
    if window_minutes is None:
        return

    try:
        window = int(window_minutes)
    except (TypeError, ValueError):
        return

    if window <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Редактирование сообщений отключено настройками компании",
        )

    if message_created_at is None:
        return

    deadline = message_created_at + timedelta(minutes=window)
    if datetime.utcnow() > deadline:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Истёк срок редактирования сообщения",
        )


def filter_notifications_by_enabled_categories(
    db: Session,
    *,
    tenant_id: int | None,
    notifications: list[dict],
) -> list[dict]:
    settings = get_notifications_runtime_settings(db, tenant_id=tenant_id)
    enabled_categories = settings.get("enabled_categories")
    if not isinstance(enabled_categories, list) or not enabled_categories:
        return notifications

    allowed = {str(item).strip().lower() for item in enabled_categories}
    return [
        item
        for item in notifications
        if str(item.get("category") or "").strip().lower() in allowed
    ]
