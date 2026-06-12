import GeneralSettingsPanel from "../GeneralSettingsPanel.jsx";
import { resolveSettingsLabels, SETTINGS_SCOPE_PLATFORM } from "../settingsLabels.js";
import {
  CardTitle,
  Field,
  SettingRow,
  SmallSelect,
  StorageRow,
  TextAreaField,
  ToggleField,
  ToggleRow,
  cardStyle,
  fieldsColumnStyle,
  outlineButtonStyle,
  progressBarStyle,
  progressValueStyle,
  saveButtonStyle,
  settingsListStyle,
  settingsTabGridStyle,
  settingsTabPageStyle,
  storageCardStyle,
  storageHeaderStyle,
  storageMetaStyle,
  storageRowsStyle,
  twoColumnsStyle,
  twoColumnsWideLeftStyle,
} from "../systemSettingsUi.jsx";
import PlatformGeneralMainInfoForm from "../../../controlPlane/platformProfile/PlatformGeneralMainInfoForm.jsx";
import { mapPlatformProfileToGeneralSettings } from "../../../controlPlane/platformProfile/platformProfileSettingsModel.js";
import { formatPlatformDateTime } from "../../../../shared/platformSettings/platformDateTimeFormat.js";

function TabPage({ children }) {
  return <div style={settingsTabPageStyle}>{children}</div>;
}

function resolveProfile(settings = {}, path, fallback = "") {
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

export function GeneralSettingsTab({ scope = SETTINGS_SCOPE_PLATFORM, settings = {} }) {
  const generalSettings =
    scope === SETTINGS_SCOPE_PLATFORM
      ? mapPlatformProfileToGeneralSettings(settings)
      : settings;

  const platformGeneralSettings =
    scope === SETTINGS_SCOPE_PLATFORM
      ? {
          ...generalSettings,
          systemInfo: {
            ...generalSettings.systemInfo,
            updatedAt: settings?.updatedAt
              ? formatPlatformDateTime(settings.updatedAt)
              : generalSettings.systemInfo.updatedAt,
          },
        }
      : generalSettings;

  return (
    <TabPage>
      <GeneralSettingsPanel
        scope={scope}
        settings={platformGeneralSettings}
        mainInfoSlot={
          scope === SETTINGS_SCOPE_PLATFORM ? <PlatformGeneralMainInfoForm /> : null
        }
      />
    </TabPage>
  );
}

export function BrandingTab({ scope = SETTINGS_SCOPE_PLATFORM, settings = {} }) {
  const labels = resolveSettingsLabels(scope);

  return (
    <TabPage>
      <div style={settingsTabGridStyle}>
        <section style={cardStyle}>
          <CardTitle title={labels.brandingTitle} />
          <div style={fieldsColumnStyle}>
            <Field label={labels.logo} value={resolveProfile(settings, "branding.logoPath", "/assets/brand/logo.svg")} />
            <Field label={labels.colorScheme} value={resolveProfile(settings, "branding.colorScheme", "ЯсноПро Blue")} />
            <Field label={labels.uiName} value={resolveProfile(settings, "branding.uiName", "ЯсноПро")} />
            <button type="button" style={saveButtonStyle}>
              {labels.saveChanges}
            </button>
          </div>
        </section>
      </div>
    </TabPage>
  );
}

export function LocalizationTab({ settings = {} }) {
  return (
    <TabPage>
      <div style={settingsTabGridStyle}>
        <section style={cardStyle}>
          <CardTitle title="Локализация" />
          <div style={fieldsColumnStyle}>
            <Field label="Часовой пояс" value={resolveProfile(settings, "localization.timezone", "(UTC+03:00) Москва")} />
            <div style={twoColumnsStyle}>
              <Field label="Формат даты" value={resolveProfile(settings, "localization.dateFormat", "DD.MM.YYYY")} />
              <Field label="Формат времени" value={resolveProfile(settings, "localization.timeFormat", "24 часа (14:30)")} />
            </div>
            <Field label="Первый день недели" value={resolveProfile(settings, "localization.weekStart", "Понедельник")} />
            <Field label="Язык системы" value={resolveProfile(settings, "localization.language", "Русский")} />
            <button type="button" style={saveButtonStyle}>
              Сохранить изменения
            </button>
          </div>
        </section>
      </div>
    </TabPage>
  );
}

export function NotificationsTab({ settings = {} }) {
  return (
    <TabPage>
      <div style={settingsTabGridStyle}>
        <section style={cardStyle}>
          <CardTitle title="Почтовые настройки (SMTP)" badge="Подключено" />
          <div style={fieldsColumnStyle}>
            <Field label="SMTP сервер" value={resolveProfile(settings, "notifications.smtpHost", "smtp.yasno.ru")} />
            <div style={twoColumnsStyle}>
              <Field label="Порт" value={resolveProfile(settings, "notifications.smtpPort", "587")} />
              <ToggleField label="Использование SSL" enabled />
            </div>
            <Field label="Логин" value={resolveProfile(settings, "notifications.smtpLogin", "noreply@yasno.ru")} />
            <Field
              label="Отправитель по умолчанию"
              value={resolveProfile(settings, "notifications.sender", "ЯсноПро <noreply@yasno.ru>")}
            />
            <ToggleRow title="Email-уведомления" description="Системные письма платформы" enabled />
            <ToggleRow title="Telegram / внешние каналы" description="Интеграции уведомлений" />
            <button type="button" style={outlineButtonStyle}>
              Проверить подключение
            </button>
          </div>
        </section>
      </div>
    </TabPage>
  );
}

export function LimitsTab({ settings = {} }) {
  return (
    <TabPage>
      <div style={settingsTabGridStyle}>
        <section style={cardStyle}>
          <CardTitle title="Лимиты и квоты" />
          <div style={fieldsColumnStyle}>
            <Field label="Лимит пользователей" value={resolveProfile(settings, "limits.usersLimit", "500")} />
            <Field label="Лимит компаний" value={resolveProfile(settings, "limits.companiesLimit", "120")} />
            <Field label="Лимит хранилища" value={resolveProfile(settings, "limits.storageLimit", "2 ТБ")} />
            <Field label="Тип хранилища" value={resolveProfile(settings, "limits.storageType", "Локальное хранилище")} />
            <div style={twoColumnsWideLeftStyle}>
              <Field label="Максимальный размер файла" value={resolveProfile(settings, "limits.maxFileSize", "2")} />
              <Field label="Единица" value="ГБ" />
            </div>
            <div style={storageCardStyle}>
              <div style={storageHeaderStyle}>
                <span>Использование хранилища</span>
                <span>62%</span>
              </div>
              <div style={storageMetaStyle}>1.24 ТБ из 2 ТБ</div>
              <div style={progressBarStyle}>
                <div style={progressValueStyle} />
              </div>
              <div style={storageRowsStyle}>
                <StorageRow label="Документы" value="680 ГБ" />
                <StorageRow label="Файлы проектов" value="420 ГБ" />
                <StorageRow label="Прочие файлы" value="140 ГБ" />
              </div>
            </div>
            <button type="button" style={saveButtonStyle}>
              Сохранить изменения
            </button>
          </div>
        </section>
      </div>
    </TabPage>
  );
}

export function BackupTab({ settings = {} }) {
  return (
    <TabPage>
      <div style={settingsTabGridStyle}>
        <section style={cardStyle}>
          <CardTitle title="Резервное копирование" />
          <div style={fieldsColumnStyle}>
            <Field label="Расписание копирования" value={resolveProfile(settings, "backup.schedule", "Ежедневно, 02:00 (МСК)")} />
            <Field label="Последняя резервная копия" value={resolveProfile(settings, "backup.lastBackupAt", "10.06.2026 02:14")} />
            <Field label="Состояние" value={resolveProfile(settings, "backup.status", "Успешно")} />
            <button type="button" style={outlineButtonStyle}>
              Запустить резервное копирование
            </button>
          </div>
        </section>
      </div>
    </TabPage>
  );
}

export function SecurityTab({ settings = {} }) {
  return (
    <TabPage>
      <div style={settingsTabGridStyle}>
        <section style={cardStyle}>
          <CardTitle title="Безопасность" />
          <div style={settingsListStyle}>
            <ToggleRow title="Двухфакторная аутентификация (2FA)" description="Требовать 2FA для пользователей платформы" enabled />
            <ToggleRow title="Подтверждение email" description="Подтверждение email при регистрации и смене почты" enabled />
          </div>
        </section>

        <section style={cardStyle}>
          <CardTitle title="Политики паролей" />
          <div style={fieldsColumnStyle}>
            <div style={twoColumnsWideLeftStyle}>
              <Field label="Минимальная длина пароля" value={resolveProfile(settings, "security.minPasswordLength", "8")} />
              <Field label="Единица" value="символов" />
            </div>
            <ToggleRow title="Требовать заглавные буквы" enabled compact />
            <ToggleRow title="Требовать строчные буквы" enabled compact />
            <ToggleRow title="Требовать цифры" enabled compact />
            <Field label="Активные сессии" value={resolveProfile(settings, "security.activeSessions", "98")} />
            <button type="button" style={saveButtonStyle}>
              Сохранить изменения
            </button>
          </div>
        </section>
      </div>
    </TabPage>
  );
}

export function SystemBehaviorTab({ settings = {} }) {
  return (
    <TabPage>
      <div style={settingsTabGridStyle}>
        <section style={cardStyle}>
          <CardTitle title="Поведение системы" />
          <div style={settingsListStyle}>
            <ToggleRow
              title="Технический режим"
              description="Включить режим технического обслуживания платформы"
            />
            <ToggleRow
              title="Показывать советы и подсказки"
              description="Отображать подсказки для новых пользователей"
              enabled
            />
            <SettingRow
              title="Автоматический выход из системы"
              description="Завершать сессию при неактивности пользователя"
              right={<SmallSelect value={resolveProfile(settings, "behavior.autoLogout", "30 мин")} />}
            />
            <Field label="Системные параметры" value={resolveProfile(settings, "behavior.systemParams", "Стандартный профиль")} />
          </div>
          <button type="button" style={saveButtonStyle}>
            Сохранить изменения
          </button>
        </section>
      </div>
    </TabPage>
  );
}
