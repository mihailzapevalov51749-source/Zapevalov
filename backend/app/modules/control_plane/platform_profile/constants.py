from enum import Enum


class PlatformDateFormat(str, Enum):
    DMY = "DD.MM.YYYY"
    ISO = "YYYY-MM-DD"


class PlatformTimeFormat(str, Enum):
    H24 = "24h"
    H12 = "12h"


PLATFORM_DATE_FORMAT_LABELS = {
    PlatformDateFormat.DMY.value: "DD.MM.YYYY",
    PlatformDateFormat.ISO.value: "YYYY-MM-DD",
}

PLATFORM_TIME_FORMAT_LABELS = {
    PlatformTimeFormat.H24.value: "24 часа (14:30)",
    PlatformTimeFormat.H12.value: "12 часов (02:30 PM)",
}

PLATFORM_WEEK_START_OPTIONS = (
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
)

PLATFORM_LANGUAGE_OPTIONS = (
    ("ru", "Русский"),
    ("en", "English"),
)

PLATFORM_TIMEZONE_OPTIONS = (
    "(UTC+03:00) Москва",
    "(UTC+00:00) UTC",
    "(UTC+02:00) Калининград",
    "(UTC+04:00) Самара",
    "(UTC+05:00) Екатеринбург",
    "(UTC+07:00) Новосибирск",
)

PLATFORM_SETTINGS_SINGLETON_ID = 1

DEFAULT_PLATFORM_NAME = "ЯсноПро"
DEFAULT_PLATFORM_SHORT_NAME = "ЯсноПро"
DEFAULT_PLATFORM_DESCRIPTION = (
    "Платформа для управления корпоративными процессами и рабочими пространствами."
)
DEFAULT_PLATFORM_TIMEZONE = "(UTC+03:00) Москва"
DEFAULT_PLATFORM_DATE_FORMAT = PlatformDateFormat.DMY.value
DEFAULT_PLATFORM_TIME_FORMAT = PlatformTimeFormat.H24.value
DEFAULT_PLATFORM_WEEK_START = "Понедельник"
DEFAULT_PLATFORM_LANGUAGE = "ru"
