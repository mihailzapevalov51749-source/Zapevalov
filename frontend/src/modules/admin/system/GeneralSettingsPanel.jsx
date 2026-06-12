import {
  TENANT_GENERAL_SETTINGS_DEFAULTS,
  resolveGeneralSetting,
} from "./generalSettingsDefaults.js";
import {
  resolveSettingsLabels,
  SETTINGS_SCOPE_TENANT,
} from "./settingsLabels.js";
import {
  CardTitle,
  Field,
  InfoRow,
  SettingRow,
  SmallSelect,
  StorageRow,
  TextAreaField,
  ToggleField,
  ToggleRow,
  bottomGridStyle,
  cardStyle,
  fieldsColumnStyle,
  outlineButtonStyle,
  progressBarStyle,
  progressValueStyle,
  saveButtonStyle,
  settingsListStyle,
  storageCardStyle,
  storageHeaderStyle,
  storageMetaStyle,
  storageRowsStyle,
  systemInfoListStyle,
  topGridStyle,
  twoColumnsStyle,
  twoColumnsWideLeftStyle,
} from "./systemSettingsUi.jsx";

function readSetting(settings, path, tenantPath) {
  return resolveGeneralSetting(
    settings,
    path,
    resolveGeneralSetting(TENANT_GENERAL_SETTINGS_DEFAULTS, tenantPath),
  );
}

export default function GeneralSettingsPanel({
  scope = SETTINGS_SCOPE_TENANT,
  settings = {},
  mainInfoSlot = null,
}) {
  const labels = resolveSettingsLabels(scope);
  const maintenanceDescription =
    scope === SETTINGS_SCOPE_TENANT
      ? "Включить режим технического обслуживания"
      : "Включить режим технического обслуживания платформы";
  const smtpSenderFallback =
    scope === SETTINGS_SCOPE_TENANT
      ? TENANT_GENERAL_SETTINGS_DEFAULTS.smtp.sender
      : "ЯсноПро <noreply@yasno.ru>";

  return (
    <>
      <div style={topGridStyle}>
        <section style={cardStyle}>
          <CardTitle title="Основная информация" />

          {mainInfoSlot ?? (
            <div style={fieldsColumnStyle}>
              <Field
                label={labels.platformName}
                value={readSetting(settings, "general.name", "general.name")}
              />
              <Field
                label={labels.shortName}
                value={readSetting(settings, "general.shortName", "general.shortName")}
              />
              <TextAreaField
                label={labels.description}
                value={readSetting(settings, "general.description", "general.description")}
              />
              <Field
                label="Часовой пояс"
                value={readSetting(settings, "general.timezone", "general.timezone")}
              />
              <div style={twoColumnsStyle}>
                <Field
                  label="Формат даты"
                  value={readSetting(settings, "general.dateFormat", "general.dateFormat")}
                />
                <Field
                  label="Формат времени"
                  value={readSetting(settings, "general.timeFormat", "general.timeFormat")}
                />
              </div>
              <div style={twoColumnsStyle}>
                <Field
                  label="Первый день недели"
                  value={readSetting(settings, "general.weekStart", "general.weekStart")}
                />
                <Field
                  label="Язык системы по умолчанию"
                  value={readSetting(settings, "general.language", "general.language")}
                />
              </div>
              <button type="button" style={saveButtonStyle}>
                {labels.saveChanges}
              </button>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <CardTitle title="Ключевые параметры" />

          <div style={settingsListStyle}>
            <ToggleRow
              title="Включить многопроектность"
              description="Разрешить работу с несколькими проектами в одном workspace"
              enabled
            />
            <ToggleRow
              title="Включить двухфакторную аутентификацию (2FA)"
              description="Требовать 2FA для всех пользователей"
              enabled
            />
            <ToggleRow
              title="Требовать подтверждение email"
              description="Подтверждение email при регистрации и смене почты"
              enabled
            />
            <SettingRow
              title="Автоматический выход из системы"
              description="Завершать сессию при неактивности пользователя"
              right={(
                <SmallSelect
                  value={readSetting(
                    settings,
                    "keyParameters.autoLogout",
                    "keyParameters.autoLogout",
                  )}
                />
              )}
            />
            <ToggleRow
              title="Показывать советы и подсказки"
              description="Отображать подсказки для новых пользователей"
              enabled
            />
            <ToggleRow
              title="Технический режим (ограниченный доступ)"
              description={maintenanceDescription}
            />
          </div>

          <button type="button" style={saveButtonStyle}>
            {labels.saveChanges}
          </button>
        </section>

        <section style={cardStyle}>
          <CardTitle title="Хранилище файлов" />

          <div style={fieldsColumnStyle}>
            <Field
              label="Тип хранилища"
              value={readSetting(settings, "storage.type", "storage.type")}
            />
            <Field
              label="Путь к хранилищу"
              value={readSetting(settings, "storage.path", "storage.path")}
            />
            <div style={twoColumnsWideLeftStyle}>
              <Field
                label="Максимальный размер файла"
                value={readSetting(settings, "storage.maxFileSize", "storage.maxFileSize")}
              />
              <Field
                label="Единица"
                value={readSetting(settings, "storage.maxFileSizeUnit", "storage.maxFileSizeUnit")}
              />
            </div>
            <Field
              label="Срок хранения удалённых файлов"
              value={readSetting(
                settings,
                "storage.deletedFilesRetention",
                "storage.deletedFilesRetention",
              )}
            />
            <div style={storageCardStyle}>
              <div style={storageHeaderStyle}>
                <span>Использование хранилища</span>
                <span>
                  {readSetting(settings, "storage.usagePercent", "storage.usagePercent")}
                </span>
              </div>
              <div style={storageMetaStyle}>
                {readSetting(settings, "storage.usageSummary", "storage.usageSummary")}
              </div>
              <div style={progressBarStyle}>
                <div style={progressValueStyle} />
              </div>
              <div style={storageRowsStyle}>
                <StorageRow
                  label="Документы"
                  value={readSetting(settings, "storage.documents", "storage.documents")}
                />
                <StorageRow
                  label="Файлы проектов"
                  value={readSetting(settings, "storage.projectFiles", "storage.projectFiles")}
                />
                <StorageRow
                  label="Прочие файлы"
                  value={readSetting(settings, "storage.otherFiles", "storage.otherFiles")}
                />
              </div>
            </div>
            <button type="button" style={saveButtonStyle}>
              {labels.saveChanges}
            </button>
          </div>
        </section>
      </div>

      <div style={bottomGridStyle}>
        <section style={cardStyle}>
          <CardTitle
            title="Почтовые настройки (SMTP)"
            badge={readSetting(settings, "smtp.badge", "smtp.badge")}
          />
          <div style={fieldsColumnStyle}>
            <Field
              label="SMTP сервер"
              value={readSetting(settings, "smtp.host", "smtp.host")}
            />
            <div style={twoColumnsStyle}>
              <Field
                label="Порт"
                value={readSetting(settings, "smtp.port", "smtp.port")}
              />
              <ToggleField label="Использование SSL" enabled />
            </div>
            <Field
              label="Логин"
              value={readSetting(settings, "smtp.login", "smtp.login")}
            />
            <Field
              label="Отправитель по умолчанию"
              value={readSetting(settings, "smtp.sender", "smtp.sender") || smtpSenderFallback}
            />
            <button type="button" style={outlineButtonStyle}>
              Проверить подключение
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <CardTitle title="Политики паролей" />
          <div style={fieldsColumnStyle}>
            <div style={twoColumnsWideLeftStyle}>
              <Field
                label="Минимальная длина пароля"
                value={readSetting(
                  settings,
                  "passwordPolicies.minLength",
                  "passwordPolicies.minLength",
                )}
              />
              <Field
                label="Единица"
                value={readSetting(
                  settings,
                  "passwordPolicies.minLengthUnit",
                  "passwordPolicies.minLengthUnit",
                )}
              />
            </div>
            <ToggleRow title="Требовать заглавные буквы" enabled compact />
            <ToggleRow title="Требовать строчные буквы" enabled compact />
            <ToggleRow title="Требовать цифры" enabled compact />
            <ToggleRow title="Требовать спец. символы" enabled compact />
            <Field
              label="Срок действия пароля"
              value={readSetting(
                settings,
                "passwordPolicies.expiry",
                "passwordPolicies.expiry",
              )}
            />
            <Field
              label="История паролей"
              value={readSetting(
                settings,
                "passwordPolicies.history",
                "passwordPolicies.history",
              )}
            />
            <button type="button" style={saveButtonStyle}>
              {labels.saveChanges}
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <CardTitle title="Поддержка и контакты" />
          <div style={fieldsColumnStyle}>
            <Field
              label="Email поддержки"
              value={readSetting(settings, "support.email", "support.email")}
            />
            <Field
              label="Телефон поддержки"
              value={readSetting(settings, "support.phone", "support.phone")}
            />
            <Field
              label="Ссылка на базу знаний"
              value={readSetting(settings, "support.knowledgeBaseUrl", "support.knowledgeBaseUrl")}
            />
            <Field
              label="Режим работы поддержки"
              value={readSetting(settings, "support.schedule", "support.schedule")}
            />
            <ToggleRow title="Уведомлять о новых версиях" enabled compact />
            <button type="button" style={saveButtonStyle}>
              {labels.saveChanges}
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <CardTitle title="Системная информация" />
          <div style={systemInfoListStyle}>
            <InfoRow
              label={labels.version}
              value={readSetting(settings, "systemInfo.version", "systemInfo.version")}
            />
            <InfoRow
              label="Дата обновления"
              value={readSetting(settings, "systemInfo.updatedAt", "systemInfo.updatedAt")}
            />
            <InfoRow
              label="Сервер"
              value={readSetting(settings, "systemInfo.server", "systemInfo.server")}
            />
            <InfoRow
              label="База данных"
              value={readSetting(settings, "systemInfo.database", "systemInfo.database")}
            />
            <InfoRow
              label="Активных пользователей"
              value={readSetting(settings, "systemInfo.activeUsers", "systemInfo.activeUsers")}
            />
            <InfoRow
              label="Активных сессий"
              value={readSetting(
                settings,
                "systemInfo.activeSessions",
                "systemInfo.activeSessions",
              )}
            />
            <InfoRow
              label="Время работы системы"
              value={readSetting(settings, "systemInfo.uptime", "systemInfo.uptime")}
            />
          </div>
          <button type="button" style={outlineButtonStyle}>
            Скачать системный отчёт
          </button>
        </section>
      </div>
    </>
  );
}
