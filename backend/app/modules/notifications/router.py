from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.notifications.schemas import NotificationRead
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User

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
    current_user: User = Depends(get_current_user),
):
    return NotificationService.get_user_notifications(
        db,
        user_id=current_user.id,
        limit=limit,
        category=category,
        only_unread=only_unread,
    )


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = NotificationService.get_unread_count(
        db,
        user_id=current_user.id,
    )

    return {
        "count": count,
    }


@router.patch("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = NotificationService.mark_all_as_read(
        db,
        user_id=current_user.id,
    )

    return {
        "success": True,
        "count": count,
    }


@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    NotificationService.mark_as_read(
        db,
        notification_id=notification_id,
        user_id=current_user.id,
    )

    return {
        "success": True,
    }