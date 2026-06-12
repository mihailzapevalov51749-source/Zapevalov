/**
 * Platform-level settings (Control Plane).
 * Not tenant_settings — separate domain for future backend API.
 */
export const PLATFORM_PROFILE_SETTINGS_DOMAIN = "platform_profile_settings";

export function createDefaultPlatformProfileSettings() {
  return {
    domain: PLATFORM_PROFILE_SETTINGS_DOMAIN,
    general: {
      name: "ЯсноПро",
      shortName: "ЯсноПро",
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
      path: "/data/yasno/platform-files",
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
      sender: "ЯсноПро <noreply@yasno.ru>",
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
      updatedAt: "10.06.2026 10:30",
      server: "YASNOPRO-01",
      database: "PostgreSQL 15.4",
      activeUsers: "164",
      activeSessions: "98",
      uptime: "24 дн. 14 ч. 22 мин.",
    },
    branding: {
      logoPath: "/assets/brand/logo.svg",
      colorScheme: "ЯсноПро Blue",
      uiName: "ЯсноПро",
    },
    localization: {
      timezone: "(UTC+03:00) Москва",
      dateFormat: "DD.MM.YYYY",
      timeFormat: "24 часа (14:30)",
      weekStart: "Понедельник",
      language: "Русский",
    },
    notifications: {
      smtpHost: "smtp.yasno.ru",
      smtpPort: "587",
      smtpLogin: "noreply@yasno.ru",
      sender: "ЯсноПро <noreply@yasno.ru>",
    },
    limits: {
      usersLimit: "500",
      companiesLimit: "120",
      storageLimit: "2 ТБ",
      storageType: "Локальное хранилище",
      maxFileSize: "2",
    },
    backup: {
      schedule: "Ежедневно, 02:00 (МСК)",
      lastBackupAt: "10.06.2026 02:14",
      status: "Успешно",
    },
    security: {
      minPasswordLength: "8",
      activeSessions: "98",
    },
    behavior: {
      autoLogout: "30 мин",
      systemParams: "Стандартный профиль",
    },
    updatedAt: null,
  };
}

/**
 * Shape consumed by GeneralSettingsPanel (platform scope only).
 */
export function mapPlatformProfileToGeneralSettings(profile = {}) {
  const defaults = createDefaultPlatformProfileSettings();

  return {
    general: {
      ...defaults.general,
      ...profile.general,
    },
    keyParameters: {
      ...defaults.keyParameters,
      ...profile.keyParameters,
      autoLogout:
        profile.keyParameters?.autoLogout
        ?? profile.behavior?.autoLogout
        ?? defaults.keyParameters.autoLogout,
    },
    storage: {
      ...defaults.storage,
      ...profile.storage,
    },
    smtp: {
      ...defaults.smtp,
      ...profile.smtp,
      host: profile.smtp?.host ?? profile.notifications?.smtpHost ?? defaults.smtp.host,
      port: profile.smtp?.port ?? profile.notifications?.smtpPort ?? defaults.smtp.port,
      login: profile.smtp?.login ?? profile.notifications?.smtpLogin ?? defaults.smtp.login,
      sender: profile.smtp?.sender ?? profile.notifications?.sender ?? defaults.smtp.sender,
    },
    passwordPolicies: {
      ...defaults.passwordPolicies,
      ...profile.passwordPolicies,
      minLength:
        profile.passwordPolicies?.minLength
        ?? profile.security?.minPasswordLength
        ?? defaults.passwordPolicies.minLength,
    },
    support: {
      ...defaults.support,
      ...profile.support,
    },
    systemInfo: {
      ...defaults.systemInfo,
      ...profile.systemInfo,
    },
  };
}
