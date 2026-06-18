from sqlalchemy.orm import Session

from app.modules.calendar import crud
from app.modules.calendar.models import CalendarEvent
from app.modules.chats import crud as chats_crud
from app.modules.notifications.models import Notification, NotificationRecipient
from app.modules.notifications.target_context import (
    build_notification_target,
    merge_notification_context,
)
from app.modules.platform_event_journal.audit_service import record_tenant_event
from app.modules.platform_event_journal.tenant_audit_constants import (
    TenantEventCategory,
    TenantEventCode,
)
from app.modules.tenant_roles.access import resolve_role_name
from app.modules.tenant_roles.constants import TENANT_ADMIN, TENANT_SUPERADMIN
from app.modules.users.models import User


def can_edit_calendar_event(user: User, event: CalendarEvent) -> bool:
    if int(event.created_by_id) == int(user.id):
        return True

    role_name = resolve_role_name(user)
    return role_name in {TENANT_SUPERADMIN, TENANT_ADMIN}


def create_calendar_event(
    db: Session,
    *,
    tenant_id: int,
    created_by_id: int,
    payload,
) -> CalendarEvent:
    meeting_url = payload.meeting_url
    if payload.create_video_meeting and not meeting_url:
        meeting_url = "https://meet.example.com/placeholder"

    chat_id = None
    if payload.create_event_chat:
        chat = chats_crud.create_chat(
            db,
            title=payload.title,
            description=payload.description,
            type="group",
            avatar_url=None,
            avatar_settings=None,
            workspace_id=None,
            tenant_id=tenant_id,
            created_by_id=created_by_id,
            participant_ids=payload.participant_ids,
        )
        chat_id = chat.id

    event = crud.create_event(
        db,
        tenant_id=tenant_id,
        title=payload.title,
        description=payload.description,
        event_type=payload.event_type,
        start_at=payload.start_at,
        end_at=payload.end_at,
        location=payload.location,
        meeting_url=meeting_url,
        chat_id=chat_id,
        created_by_id=created_by_id,
        participant_ids=payload.participant_ids,
    )

    notify_event_invites(
        db,
        event=event,
        sender_user_id=created_by_id,
    )

    record_tenant_event(
        db,
        tenant_id=tenant_id,
        event_code=TenantEventCode.CALENDAR_EVENT_CREATED.value,
        event_category=TenantEventCategory.CALENDAR.value,
        title=f"Создано событие календаря: {event.title}",
        actor_user_id=created_by_id,
        target_type="calendar_event",
        target_id=event.id,
        target_name=event.title,
        metadata={
            "tenant_id": tenant_id,
            "event_id": event.id,
            "event_type": event.event_type,
            "participants_count": len(event.participants),
        },
        slug=f"calendar-event-created-{tenant_id}-{event.id}",
        commit=False,
    )

    db.commit()
    return crud.get_event_by_id(db, event.id)


def notify_event_invites(
    db: Session,
    *,
    event: CalendarEvent,
    sender_user_id: int,
) -> None:
    for participant in event.participants:
        if int(participant.user_id) == int(sender_user_id):
            continue

        create_calendar_notification(
            db,
            event=event,
            recipient_user_id=participant.user_id,
            sender_user_id=sender_user_id,
        )


def create_calendar_notification(
    db: Session,
    *,
    event: CalendarEvent,
    recipient_user_id: int,
    sender_user_id: int,
) -> None:
    target = build_notification_target(
        target_type="calendar_event",
        target_id=event.id,
        tenant_id=event.tenant_id,
        portal_id=event.tenant_id,
        runtime="runtime.calendar",
        action="open",
    )
    context = merge_notification_context(
        tenant_id=event.tenant_id,
        portal_id=event.tenant_id,
        entity_type="calendar_event",
        entity_id=event.id,
        target=target,
        extra={
            "event_id": event.id,
            "tab": "calendar",
        },
    )

    notification = Notification(
        type="calendar_invite",
        category="calendar",
        priority="normal",
        title=f"Вас пригласили на событие: {event.title}",
        message=event.description,
        entity_type="calendar_event",
        entity_id=str(event.id),
        created_by_id=sender_user_id,
        context=context,
    )
    db.add(notification)
    db.flush()

    db.add(
        NotificationRecipient(
            notification_id=notification.id,
            user_id=int(recipient_user_id),
        )
    )
