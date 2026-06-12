export const PLATFORM_TIMEZONE_OPTIONS = [
  "(UTC+03:00) Москва",
  "(UTC+00:00) UTC",
  "(UTC+02:00) Калининград",
  "(UTC+04:00) Самара",
  "(UTC+05:00) Екатеринбург",
  "(UTC+07:00) Новосибирск",
];

export const PLATFORM_DATE_FORMAT_OPTIONS = [
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

export const PLATFORM_TIME_FORMAT_OPTIONS = [
  { value: "24 часа (14:30)", label: "24 часа (14:30)" },
  { value: "12 часов (02:30 PM)", label: "12 часов (02:30 PM)" },
];

export const PLATFORM_WEEK_START_OPTIONS = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

export const PLATFORM_LANGUAGE_OPTIONS = [
  { value: "Русский", label: "Русский" },
  { value: "English", label: "English" },
];

export const DEFAULT_PLATFORM_SETTINGS = {
  platformName: "ЯсноПро",
  platformShortName: "ЯсноПро",
  description:
    "Платформа для управления корпоративными процессами и рабочими пространствами.",
  timezone: "(UTC+03:00) Москва",
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24 часа (14:30)",
  weekStartDay: "Понедельник",
  defaultLanguage: "Русский",
};
