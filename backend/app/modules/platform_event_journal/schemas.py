from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.modules.platform_dashboard.datetime_utils import serialize_utc_datetime
from app.modules.platform_event_journal.constants import (
    PlatformEventJournalStatus,
    PlatformEventJournalType,
)


class PlatformEventJournalEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    description: str | None = None
    event_type: str
    status: str
    author: str | None = None
    author_user_id: int | None = None
    source: str
    occurred_at: datetime
    created_at: datetime

    @field_serializer("occurred_at", "created_at")
    def serialize_datetimes(self, value: datetime) -> str:
        return serialize_utc_datetime(value) or ""


class PlatformEventJournalEntryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    event_type: str = PlatformEventJournalType.ARCHITECTURE.value
    status: str = PlatformEventJournalStatus.DONE.value
    author: str | None = "Cursor"
    slug: str | None = Field(default=None, max_length=160)
    source: str = "cursor"
    occurred_at: datetime | None = None

    @field_validator("title", "description", "author", "slug", mode="before")
    @classmethod
    def normalize_text(cls, value: Any) -> Any:
        if value is None:
            return value
        if isinstance(value, str):
            cleaned = value.strip()
            return cleaned or None
        return value

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        allowed = {item.value for item in PlatformEventJournalType}
        if normalized not in allowed:
            raise ValueError(f"Unsupported event_type: {value}")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        allowed = {item.value for item in PlatformEventJournalStatus}
        if normalized not in allowed:
            raise ValueError(f"Unsupported status: {value}")
        return normalized


class PlatformEventJournalListResponse(BaseModel):
    items: list[PlatformEventJournalEntryRead]
