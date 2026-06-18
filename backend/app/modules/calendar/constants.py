"""Calendar event types and participant statuses."""

from __future__ import annotations

CALENDAR_EVENT_TYPES: tuple[str, ...] = (
    "meeting",
    "conference",
    "deadline",
    "reminder",
    "checkpoint",
    "video_meeting",
    "standup",
    "contractor_meeting",
    "doc_review",
    "site_visit",
    "deadline_control",
    "milestone_delivery",
)

CALENDAR_EVENT_TYPE_LABELS: dict[str, str] = {
    "meeting": "Встреча",
    "conference": "Совещание",
    "deadline": "Дедлайн",
    "reminder": "Напоминание",
    "checkpoint": "Контрольная точка",
    "video_meeting": "Видеовстреча",
    "standup": "Планёрка",
    "contractor_meeting": "Совещание с подрядчиком",
    "doc_review": "Проверка документации",
    "site_visit": "Выезд на объект",
    "deadline_control": "Контроль срока",
    "milestone_delivery": "Сдача этапа",
}

CALENDAR_EVENT_STATUSES: tuple[str, ...] = ("scheduled", "cancelled", "completed")

PARTICIPANT_STATUSES: tuple[str, ...] = (
    "pending",
    "accepted",
    "declined",
    "tentative",
)
