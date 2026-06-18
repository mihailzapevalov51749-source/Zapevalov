from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.control_plane.platform_profile.constants import (
    PLATFORM_DATE_FORMAT_LABELS,
    PLATFORM_LANGUAGE_OPTIONS,
    PLATFORM_TIME_FORMAT_LABELS,
    PLATFORM_TIMEZONE_OPTIONS,
    PLATFORM_WEEK_START_OPTIONS,
)


def _normalize_language(value: str) -> str:
    normalized = str(value or "").strip().lower()
    labels = {label.lower(): code for code, label in PLATFORM_LANGUAGE_OPTIONS}
    if normalized in labels:
        return labels[normalized]
    if normalized in {code for code, _ in PLATFORM_LANGUAGE_OPTIONS}:
        return normalized
    raise ValueError("Недопустимый язык системы")


def _normalize_date_format(value: str) -> str:
    normalized = str(value or "").strip()
    if normalized in PLATFORM_DATE_FORMAT_LABELS:
        return normalized
    if normalized in PLATFORM_DATE_FORMAT_LABELS.values():
        return normalized
    for code, label in PLATFORM_DATE_FORMAT_LABELS.items():
        if normalized == label:
            return code
    raise ValueError("Недопустимый формат даты")


def _normalize_time_format(value: str) -> str:
    normalized = str(value or "").strip()
    if normalized in PLATFORM_TIME_FORMAT_LABELS:
        return normalized
    for code, label in PLATFORM_TIME_FORMAT_LABELS.items():
        if normalized == label:
            return code
    raise ValueError("Недопустимый формат времени")


class PlatformSettingsGeneralRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform_name: str
    platform_short_name: str
    public_slug: str | None = None
    public_slug_locked: bool = False
    public_url: str | None = None
    description: str | None = None
    timezone: str
    date_format: str
    time_format: str
    week_start_day: str
    default_language: str
    updated_at: datetime | None = None


class PlatformSettingsGeneralUpdate(BaseModel):
    platform_name: str = Field(min_length=1, max_length=255)
    platform_short_name: str = Field(min_length=1, max_length=64)
    public_slug: str = Field(min_length=1, max_length=64)
    public_slug_locked: bool = False
    description: str | None = Field(default=None, max_length=4000)
    timezone: str = Field(min_length=1, max_length=128)
    date_format: str = Field(min_length=1, max_length=32)
    time_format: str = Field(min_length=1, max_length=64)
    week_start_day: str = Field(min_length=1, max_length=32)
    default_language: str = Field(min_length=2, max_length=32)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if normalized not in PLATFORM_TIMEZONE_OPTIONS:
            raise ValueError("Недопустимый часовой пояс")
        return normalized

    @field_validator("date_format")
    @classmethod
    def validate_date_format(cls, value: str) -> str:
        return _normalize_date_format(value)

    @field_validator("time_format")
    @classmethod
    def validate_time_format(cls, value: str) -> str:
        return _normalize_time_format(value)

    @field_validator("week_start_day")
    @classmethod
    def validate_week_start_day(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if normalized not in PLATFORM_WEEK_START_OPTIONS:
            raise ValueError("Недопустимый первый день недели")
        return normalized

    @field_validator("default_language")
    @classmethod
    def validate_default_language(cls, value: str) -> str:
        return _normalize_language(value)


class PlatformOwnerRead(BaseModel):
    user_id: int | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    position: str | None = None
    avatar_url: str | None = None
    avatar_settings: dict | None = None
    is_active: bool | None = None
    exists: bool = False
    updated_at: datetime | None = None


class PlatformOwnerUpsert(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    position: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, max_length=128)
    password_confirm: str | None = Field(default=None, max_length=128)


class PlatformSetupStateRead(BaseModel):
    needs_owner_setup: bool
    has_real_owner: bool
    is_bootstrap_session: bool
    bootstrap_email: str | None = None


class PlatformOwnerFirstSetupResponse(BaseModel):
    owner: PlatformOwnerRead
    access_token: str
    token_type: str = "bearer"


class PlatformSettingsRead(BaseModel):
    general: PlatformSettingsGeneralRead
    owner: PlatformOwnerRead | None = None
