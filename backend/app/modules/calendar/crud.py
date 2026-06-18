from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.modules.calendar.models import CalendarEvent, CalendarEventParticipant


def get_event_by_id(db: Session, event_id: int) -> CalendarEvent | None:
    return (
        db.query(CalendarEvent)
        .options(
            joinedload(CalendarEvent.participants).joinedload(
                CalendarEventParticipant.user
            ),
            joinedload(CalendarEvent.created_by),
        )
        .filter(CalendarEvent.id == event_id)
        .first()
    )


def list_tenant_events(
    db: Session,
    *,
    tenant_id: int,
    start_from: datetime | None = None,
    start_to: datetime | None = None,
    event_type: str | None = None,
    participant_user_id: int | None = None,
    search: str | None = None,
) -> list[CalendarEvent]:
    query = (
        db.query(CalendarEvent)
        .options(
            joinedload(CalendarEvent.participants).joinedload(
                CalendarEventParticipant.user
            ),
        )
        .filter(CalendarEvent.tenant_id == int(tenant_id))
    )

    if start_from is not None:
        query = query.filter(CalendarEvent.start_at >= start_from)
    if start_to is not None:
        query = query.filter(CalendarEvent.start_at <= start_to)
    if event_type:
        query = query.filter(CalendarEvent.event_type == str(event_type).strip().lower())

    search_value = str(search or "").strip()
    if search_value:
        pattern = f"%{search_value}%"
        query = query.filter(CalendarEvent.title.ilike(pattern))

    if participant_user_id is not None:
        query = query.join(CalendarEventParticipant).filter(
            CalendarEventParticipant.user_id == int(participant_user_id)
        )

    return query.order_by(CalendarEvent.start_at.asc(), CalendarEvent.id.asc()).all()


def create_event(
    db: Session,
    *,
    tenant_id: int,
    title: str,
    description: str | None,
    event_type: str,
    start_at: datetime,
    end_at: datetime,
    location: str | None,
    meeting_url: str | None,
    chat_id: int | None,
    created_by_id: int,
    participant_ids: list[int],
) -> CalendarEvent:
    event = CalendarEvent(
        tenant_id=int(tenant_id),
        title=title,
        description=description,
        event_type=event_type,
        start_at=start_at,
        end_at=end_at,
        location=location,
        meeting_url=meeting_url,
        chat_id=chat_id,
        created_by_id=created_by_id,
        status="scheduled",
    )
    db.add(event)
    db.flush()

    unique_participant_ids = sorted({int(user_id) for user_id in participant_ids if user_id})
    unique_participant_ids.append(int(created_by_id))
    unique_participant_ids = sorted(set(unique_participant_ids))

    for user_id in unique_participant_ids:
        db.add(
            CalendarEventParticipant(
                event_id=event.id,
                user_id=user_id,
                status="accepted" if user_id == created_by_id else "pending",
            )
        )

    db.flush()
    return get_event_by_id(db, event.id)


def update_event(db: Session, event: CalendarEvent, data: dict) -> CalendarEvent:
    participant_ids = data.pop("participant_ids", None)

    for key, value in data.items():
        if value is not None and hasattr(event, key):
            setattr(event, key, value)

    if participant_ids is not None:
        existing = {participant.user_id for participant in event.participants}
        desired = {int(user_id) for user_id in participant_ids}
        desired.add(int(event.created_by_id))

        for participant in list(event.participants):
            if participant.user_id not in desired:
                db.delete(participant)

        for user_id in desired - existing:
            db.add(
                CalendarEventParticipant(
                    event_id=event.id,
                    user_id=user_id,
                    status="accepted" if user_id == event.created_by_id else "pending",
                )
            )

    event.updated_at = datetime.utcnow()
    db.flush()
    return get_event_by_id(db, event.id)


def delete_event(db: Session, event: CalendarEvent) -> None:
    db.delete(event)
    db.flush()


def get_participant(
    db: Session,
    *,
    event_id: int,
    user_id: int,
) -> CalendarEventParticipant | None:
    return (
        db.query(CalendarEventParticipant)
        .filter(
            CalendarEventParticipant.event_id == event_id,
            CalendarEventParticipant.user_id == user_id,
        )
        .first()
    )


def update_participant_status(
    db: Session,
    participant: CalendarEventParticipant,
    status: str,
) -> CalendarEventParticipant:
    participant.status = status
    participant.updated_at = datetime.utcnow()
    db.flush()
    return participant
