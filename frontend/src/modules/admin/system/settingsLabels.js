export const SETTINGS_SCOPE_TENANT = "tenant";
export const SETTINGS_SCOPE_PLATFORM = "platform";

export function resolveSettingsLabels(scope = SETTINGS_SCOPE_TENANT) {
  const isPlatform = scope === SETTINGS_SCOPE_PLATFORM;

  return {
    workspaceTitle: isPlatform ? "Профиль платформы" : "Настройки компании",
    adminSubtitle: isPlatform ? "Администрирование платформы" : "Администрирование компании",
    platformName: isPlatform ? "Название платформы" : "Название компании",
    shortName: isPlatform ? "Краткое название" : "Короткое название",
    description: "Описание",
    owner: isPlatform ? "Владелец платформы" : "Владелец компании",
    version: "Версия платформы",
    brandingTitle: isPlatform ? "Брендинг платформы" : "Брендинг компании",
    uiName: "Название в интерфейсе",
    colorScheme: "Цветовая схема",
    logo: "Логотип",
    saveChanges: "Сохранить изменения",
  };
}
