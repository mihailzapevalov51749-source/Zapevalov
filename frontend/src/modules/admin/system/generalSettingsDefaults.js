/**
 * Default mock values for the General Settings tab (tenant scope).
 * Separate from platform_profile_settings.
 */
export const TENANT_GENERAL_SETTINGS_DEFAULTS = {
  general: {
    name: "YasnoPro",
    shortName: "Yasno",
    description:
      "Платформа для управления корпоративными процессами и рабочими пространствами.",
    timezone: "(UTC+03:00) Москва",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "24 часа (14:30)",
    weekStart: "Понедельник",
    language: "Русский",
  },
  keyParameters: {
    autoLogout: "30 мин",
  },
  storage: {
    type: "Локальное хранилище",
    path: "/data/yasno/files",
    maxFileSize: "2",
    maxFileSizeUnit: "ГБ",
    deletedFilesRetention: "30 дней",
    usagePercent: "62%",
    usageSummary: "1.24 ТБ из 2 ТБ",
    documents: "680 ГБ",
    projectFiles: "420 ГБ",
    otherFiles: "140 ГБ",
  },
  smtp: {
    host: "smtp.yasno.ru",
    port: "587",
    login: "noreply@yasno.ru",
    sender: "YasnoPro <noreply@yasno.ru>",
    badge: "Подключено",
  },
  passwordPolicies: {
    minLength: "8",
    minLengthUnit: "символов",
    expiry: "90 дней",
    history: "5 последних паролей",
  },
  support: {
    email: "support@yasno.pro",
    phone: "8 800 123-45-67",
    knowledgeBaseUrl: "https://help.yasno.pro",
    schedule: "Пн - Пт, 09:00 - 18:00 (МСК)",
  },
  systemInfo: {
    version: "2.8.1",
    updatedAt: "15.05.2024 10:30",
    server: "YASNOPRO-01",
    database: "PostgreSQL 15.4",
    activeUsers: "164",
    activeSessions: "98",
    uptime: "24 дн. 14 ч. 22 мин.",
  },
};

export function resolveGeneralSetting(settings, path, fallback = "") {
  const segments = String(path || "").split(".");
  let current = settings;
  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return fallback;
    }
    current = current[segment];
  }
  return current ?? fallback;
}
