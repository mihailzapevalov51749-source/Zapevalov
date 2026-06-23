from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    require_runtime_actor,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.notifications.schemas import NotificationRead
from app.modules.notifications.service import NotificationService

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=list[NotificationRead],
)
def get_notifications(
    category: str | None = Query(default=None),
    only_unread: bool = Query(default=False),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    return NotificationService.get_user_notifications(
        db,
        current_user=current_actor,
        limit=limit,
        category=category,
        only_unread=only_unread,
    )


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    count = NotificationService.get_unread_count(
        db,
        current_user=current_actor,
    )

    return {
        "count": count,
    }


@router.patch("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    count = NotificationService.mark_all_as_read(
        db,
        current_user=current_actor,
    )

    return {
        "success": True,
        "count": count,
    }


@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    NotificationService.mark_as_read(
        db,
        notification_id=notification_id,
        current_user=current_actor,
    )

    return {
        "success": True,
    }