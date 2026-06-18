from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.modules.calendar.constants import (
    CALENDAR_EVENT_STATUSES,
    CALENDAR_EVENT_TYPES,
    PARTICIPANT_STATUSES,
)


class CalendarParticipantUserOut(BaseModel):
    id: int
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class CalendarEventParticipantOut(BaseModel):
    id: int
    user_id: int
    status: str
    user: CalendarParticipantUserOut | None = None

    model_config = {"from_attributes": True}


class CalendarEventOut(BaseModel):
    id: int
    tenant_id: int
    title: str
    description: str | None = None
    event_type: str
    start_at: datetime
    end_at: datetime
    location: str | None = None
    meeting_url: str | None = None
    chat_id: int | None = None
    created_by_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    participants: list[CalendarEventParticipantOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class CalendarEventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    event_type: str
    start_at: datetime
    end_at: datetime
    location: str | None = None
    meeting_url: str | None = None
    participant_ids: list[int] = Field(default_factory=list)
    create_event_chat: bool = False
    create_video_meeting: bool = False

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in CALENDAR_EVENT_TYPES:
            raise ValueError("Некорректный тип события")
        return normalized

    @field_validator("end_at")
    @classmethod
    def validate_end_after_start(cls, end_at: datetime, info):
        start_at = info.data.get("start_at")
        if start_at and end_at < start_at:
            raise ValueError("Дата окончания не может быть раньше начала")
        return end_at


class CalendarEventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    event_type: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    location: str | None = None
    meeting_url: str | None = None
    status: str | None = None
    participant_ids: list[int] | None = None

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().lower()
        if normalized not in CALENDAR_EVENT_TYPES:
            raise ValueError("Некорректный тип события")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().lower()
        if normalized not in CALENDAR_EVENT_STATUSES:
            raise ValueError("Некорректный статус события")
        return normalized


class CalendarEventRespond(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in PARTICIPANT_STATUSES:
            raise ValueError("Некорректный статус участия")
        if normalized == "pending":
            raise ValueError("Статус pending недоступен для ответа")
        return normalized
