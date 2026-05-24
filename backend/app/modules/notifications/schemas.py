from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.modules.notifications.constants import (
    NOTIFICATION_PRIORITY_NORMAL,
)


class NotificationBase(BaseModel):
    type: str

    category: str | None = None
    priority: str = NOTIFICATION_PRIORITY_NORMAL

    title: str
    message: str | None = None

    entity_type: str | None = None
    entity_id: str | None = None

    context: dict[str, Any] | None = None
    actor_snapshot: dict[str, Any] | None = None


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(BaseModel):
    id: int

    type: str
    category: str | None = None
    priority: str = NOTIFICATION_PRIORITY_NORMAL

    title: str
    message: str | None = None

    entity_type: str | None = None
    entity_id: str | None = None

    context: dict[str, Any] | None = None
    actor_snapshot: dict[str, Any] | None = None

    is_read: bool

    created_at: datetime

    class Config:
        from_attributes = True