from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    require_runtime_actor,
    resolve_runtime_actor_user_id,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.calendar import crud, service
from app.modules.calendar.schemas import (
    CalendarEventCreate,
    CalendarEventOut,
    CalendarEventRespond,
    CalendarEventUpdate,
)
from app.modules.calendar.tenant_access import (
    assert_participant_ids_belong_to_tenant,
    assert_user_has_calendar_tenant_access,
)
from app.modules.tenant_module_configurations.runtime.enforcement import (
    assert_calendar_event_type_allowed,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/tenants/{tenant_id}/calendar",
    tags=["calendar"],
)


def get_current_user_id(current_user: RuntimeDesignerActor) -> int:
    return resolve_runtime_actor_user_id(current_user)


def get_tenant_event(
    db: Session,
    *,
    tenant_id: int,
    event_id: int,
    current_user: RuntimeDesignerActor,
) -> tuple[int, object]:
    resolved_tenant_id = assert_user_has_calendar_tenant_access(
        db,
        current_user,
        tenant_id,
    )

    event = crud.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Событие не найдено",
        )

    if int(event.tenant_id) != int(resolved_tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к событию",
        )

    return resolved_tenant_id, event


@router.get("/events", response_model=list[CalendarEventOut])
def list_events(
    tenant_id: int,
    start_from: datetime | None = Query(default=None),
    start_to: datetime | None = Query(default=None),
    event_type: str | None = Query(default=None),
    participant_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    resolved_tenant_id = assert_user_has_calendar_tenant_access(
        db,
        current_user,
        tenant_id,
    )

    events = crud.list_tenant_events(
        db,
        tenant_id=resolved_tenant_id,
        start_from=start_from,
        start_to=start_to,
        event_type=event_type,
        participant_user_id=participant_id,
        search=search,
    )
    return events


@router.post("/events", response_model=CalendarEventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    tenant_id: int,
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    resolved_tenant_id = assert_user_has_calendar_tenant_access(
        db,
        current_user,
        tenant_id,
    )
    created_by_id = get_current_user_id(current_user)

    assert_participant_ids_belong_to_tenant(
        db,
        tenant_id=resolved_tenant_id,
        participant_ids=payload.participant_ids,
    )

    assert_calendar_event_type_allowed(
        db,
        tenant_id=resolved_tenant_id,
        event_type=payload.event_type,
    )

    event = service.create_calendar_event(
        db,
        tenant_id=resolved_tenant_id,
        created_by_id=created_by_id,
        payload=payload,
    )
    return event


@router.get("/events/{event_id}", response_model=CalendarEventOut)
def get_event(
    tenant_id: int,
    event_id: int,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    _, event = get_tenant_event(
        db,
        tenant_id=tenant_id,
        event_id=event_id,
        current_user=current_user,
    )
    return event


@router.patch("/events/{event_id}", response_model=CalendarEventOut)
def update_event(
    tenant_id: int,
    event_id: int,
    payload: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    _, event = get_tenant_event(
        db,
        tenant_id=tenant_id,
        event_id=event_id,
        current_user=current_user,
    )

    if not service.can_edit_calendar_event(current_user, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для редактирования события",
        )

    update_data = payload.model_dump(exclude_unset=True)
    if "participant_ids" in update_data and update_data["participant_ids"] is not None:
        assert_participant_ids_belong_to_tenant(
            db,
            tenant_id=int(event.tenant_id),
            participant_ids=update_data["participant_ids"],
        )

    if update_data.get("event_type") is not None:
        assert_calendar_event_type_allowed(
            db,
            tenant_id=int(event.tenant_id),
            event_type=update_data["event_type"],
        )

    updated = crud.update_event(db, event, update_data)
    db.commit()
    return updated


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    tenant_id: int,
    event_id: int,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    _, event = get_tenant_event(
        db,
        tenant_id=tenant_id,
        event_id=event_id,
        current_user=current_user,
    )

    if not service.can_edit_calendar_event(current_user, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для удаления события",
        )

    crud.delete_event(db, event)
    db.commit()
    return None


@router.post("/events/{event_id}/respond", response_model=CalendarEventOut)
def respond_to_event(
    tenant_id: int,
    event_id: int,
    payload: CalendarEventRespond,
    db: Session = Depends(get_db),
    current_user: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    _, event = get_tenant_event(
        db,
        tenant_id=tenant_id,
        event_id=event_id,
        current_user=current_user,
    )

    user_id = get_current_user_id(current_user)
    participant = crud.get_participant(db, event_id=event.id, user_id=user_id)
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не являетесь участником события",
        )

    crud.update_participant_status(db, participant, payload.status)
    db.commit()
    return crud.get_event_by_id(db, event.id)
