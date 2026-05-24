export default function AdminSystemPage() {
  return (
    <div style={pageStyle}>
      <div style={tabsStyle}>
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            style={{
              ...tabButtonStyle,
              ...(index === 0 ? activeTabButtonStyle : null),
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={topGridStyle}>
        <section style={cardStyle}>
          <CardTitle title="Основная информация" />

          <div style={fieldsColumnStyle}>
            <Field label="Название платформы" value="YasnoPro" />
            <Field label="Короткое название" value="Yasno" />

            <TextAreaField
              label="Описание"
              value="Платформа для управления корпоративными процессами и рабочими пространствами."
            />

            <Field label="Часовой пояс" value="(UTC+03:00) Москва" />

            <div style={twoColumnsStyle}>
              <Field label="Формат даты" value="DD.MM.YYYY" />
              <Field label="Формат времени" value="24 часа (14:30)" />
            </div>

            <div style={twoColumnsStyle}>
              <Field label="Первый день недели" value="Понедельник" />
              <Field label="Язык системы по умолчанию" value="Русский" />
            </div>

            <button type="button" style={saveButtonStyle}>
              Сохранить изменения
            </button>
          </div>
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
              right={<SmallSelect value="30 мин" />}
            />

            <ToggleRow
              title="Показывать советы и подсказки"
              description="Отображать подсказки для новых пользователей"
              enabled
            />

            <ToggleRow
              title="Технический режим (ограниченный доступ)"
              description="Включить режим технического обслуживания платформы"
            />
          </div>

          <button type="button" style={saveButtonStyle}>
            Сохранить изменения
          </button>
        </section>

        <section style={cardStyle}>
          <CardTitle title="Хранилище файлов" />

          <div style={fieldsColumnStyle}>
            <Field label="Тип хранилища" value="Локальное хранилище" />
            <Field label="Путь к хранилищу" value="/data/yasno/files" />

            <div style={twoColumnsWideLeftStyle}>
              <Field label="Максимальный размер файла" value="2" />
              <Field label="Единица" value="ГБ" />
            </div>

            <Field label="Срок хранения удалённых файлов" value="30 дней" />

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

      <div style={bottomGridStyle}>
        <section style={cardStyle}>
          <CardTitle
            title="Почтовые настройки (SMTP)"
            badge="Подключено"
          />

          <div style={fieldsColumnStyle}>
            <Field label="SMTP сервер" value="smtp.yasno.ru" />

            <div style={twoColumnsStyle}>
              <Field label="Порт" value="587" />
              <ToggleField label="Использование SSL" enabled />
            </div>

            <Field label="Логин" value="noreply@yasno.ru" />
            <Field label="Отправитель по умолчанию" value="YasnoPro <noreply@yasno.ru>" />

            <button type="button" style={outlineButtonStyle}>
              Проверить подключение
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <CardTitle title="Политики паролей" />

          <div style={fieldsColumnStyle}>
            <div style={twoColumnsWideLeftStyle}>
              <Field label="Минимальная длина пароля" value="8" />
              <Field label="Единица" value="символов" />
            </div>

            <ToggleRow title="Требовать заглавные буквы" enabled compact />
            <ToggleRow title="Требовать строчные буквы" enabled compact />
            <ToggleRow title="Требовать цифры" enabled compact />
            <ToggleRow title="Требовать спец. символы" enabled compact />

            <Field label="Срок действия пароля" value="90 дней" />
            <Field label="История паролей" value="5 последних паролей" />

            <button type="button" style={saveButtonStyle}>
              Сохранить изменения
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <CardTitle title="Поддержка и контакты" />

          <div style={fieldsColumnStyle}>
            <Field label="Email поддержки" value="support@yasno.pro" />
            <Field label="Телефон поддержки" value="8 800 123-45-67" />
            <Field label="Ссылка на базу знаний" value="https://help.yasno.pro" />
            <Field label="Режим работы поддержки" value="Пн - Пт, 09:00 - 18:00 (МСК)" />

            <ToggleRow title="Уведомлять о новых версиях" enabled compact />

            <button type="button" style={saveButtonStyle}>
              Сохранить изменения
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <CardTitle title="Системная информация" />

          <div style={systemInfoListStyle}>
            <InfoRow label="Версия платформы" value="2.8.1" />
            <InfoRow label="Дата обновления" value="15.05.2024 10:30" />
            <InfoRow label="Сервер" value="YASNOPRO-01" />
            <InfoRow label="База данных" value="PostgreSQL 15.4" />
            <InfoRow label="Активных пользователей" value="164" />
            <InfoRow label="Активных сессий" value="98" />
            <InfoRow label="Время работы системы" value="24 дн. 14 ч. 22 мин." />
          </div>

          <button type="button" style={outlineButtonStyle}>
            Скачать системный отчёт
          </button>
        </section>
      </div>
    </div>
  );
}

function CardTitle({ title, badge }) {
  return (
    <div style={cardTitleRowStyle}>
      <div style={cardTitleStyle}>{title}</div>
      {badge ? <div style={badgeStyle}>{badge}</div> : null}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={fieldWrapperStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <input value={value} readOnly style={inputStyle} />
    </div>
  );
}

function TextAreaField({ label, value }) {
  return (
    <div style={fieldWrapperStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <textarea value={value} readOnly style={textareaStyle} />
    </div>
  );
}

function ToggleField({ label, enabled = false }) {
  return (
    <div style={toggleFieldStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <Toggle enabled={enabled} />
    </div>
  );
}

function SettingRow({ title, description, right }) {
  return (
    <div style={toggleRowStyle}>
      <div>
        <div style={toggleTitleStyle}>{title}</div>
        {description ? <div style={toggleDescriptionStyle}>{description}</div> : null}
      </div>
      {right}
    </div>
  );
}

function ToggleRow({ title, description, enabled = false, compact = false }) {
  return (
    <div style={compact ? compactToggleRowStyle : toggleRowStyle}>
      <div>
        <div style={compact ? compactToggleTitleStyle : toggleTitleStyle}>
          {title}
        </div>

        {description ? (
          <div style={toggleDescriptionStyle}>{description}</div>
        ) : null}
      </div>

      <Toggle enabled={enabled} />
    </div>
  );
}

function Toggle({ enabled = false }) {
  return (
    <div
      style={{
        ...toggleStyle,
        ...(enabled ? toggleEnabledStyle : null),
      }}
    >
      <div
        style={{
          ...toggleCircleStyle,
          ...(enabled ? toggleCircleEnabledStyle : null),
        }}
      />
    </div>
  );
}

function SmallSelect({ value }) {
  return <div style={smallSelectStyle}>{value}</div>;
}

function StorageRow({ label, value }) {
  return (
    <div style={storageRowStyle}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={infoValueStyle}>{value}</span>
    </div>
  );
}

const tabs = [
  "Общие настройки",
  "Брендинг",
  "Локализация",
  "Уведомления",
  "Лимиты и квоты",
  "Резервное копирование",
  "Безопасность",
  "Поведение системы",
];

const pageStyle = {
  width: "100%",
  minHeight: "100%",
  height: "auto",
  padding: "18px 20px 48px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxSizing: "border-box",
};

const tabsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  paddingBottom: 10,
  borderBottom: "1px solid #E2E8F0",
  overflowX: "auto",
};

const tabButtonStyle = {
  height: 34,
  padding: "0 14px",
  border: "none",
  borderRadius: 0,
  background: "transparent",
  fontSize: 13,
  fontWeight: 600,
  color: "#0F172A",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const activeTabButtonStyle = {
  color: "#2563EB",
  borderBottom: "2px solid #2563EB",
};

const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1.25fr 1.1fr",
  gap: 14,
  alignItems: "stretch",
};

const bottomGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: 14,
  alignItems: "stretch",
};

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  boxSizing: "border-box",
  minHeight: 0,
};

const cardTitleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const cardTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#0F172A",
};

const badgeStyle = {
  padding: "3px 8px",
  borderRadius: 999,
  background: "#DCFCE7",
  color: "#16A34A",
  fontSize: 10,
  fontWeight: 700,
};

const fieldsColumnStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const fieldWrapperStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748B",
};

const inputStyle = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  border: "1px solid #CBD5E1",
  borderRadius: 7,
  background: "#FFFFFF",
  fontSize: 12,
  color: "#0F172A",
  boxSizing: "border-box",
  outline: "none",
};

const textareaStyle = {
  width: "100%",
  minHeight: 70,
  padding: 10,
  border: "1px solid #CBD5E1",
  borderRadius: 7,
  background: "#FFFFFF",
  fontSize: 12,
  lineHeight: 1.35,
  color: "#0F172A",
  resize: "none",
  boxSizing: "border-box",
  outline: "none",
};

const twoColumnsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const twoColumnsWideLeftStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 86px",
  gap: 10,
};

const saveButtonStyle = {
  height: 34,
  padding: "0 16px",
  border: "none",
  borderRadius: 7,
  background: "#2563EB",
  fontSize: 12,
  fontWeight: 700,
  color: "#FFFFFF",
  cursor: "pointer",
  alignSelf: "flex-start",
};

const outlineButtonStyle = {
  height: 34,
  padding: "0 16px",
  border: "1px solid #BFDBFE",
  borderRadius: 7,
  background: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
  color: "#2563EB",
  cursor: "pointer",
  alignSelf: "flex-start",
};

const settingsListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const toggleRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const compactToggleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const toggleTitleStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: "#0F172A",
};

const compactToggleTitleStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "#0F172A",
};

const toggleDescriptionStyle = {
  marginTop: 4,
  fontSize: 11,
  lineHeight: 1.35,
  color: "#64748B",
};

const toggleStyle = {
  width: 34,
  height: 18,
  borderRadius: 999,
  background: "#CBD5E1",
  position: "relative",
  flexShrink: 0,
};

const toggleEnabledStyle = {
  background: "#2563EB",
};

const toggleCircleStyle = {
  width: 14,
  height: 14,
  borderRadius: "50%",
  background: "#FFFFFF",
  position: "absolute",
  top: 2,
  left: 2,
  transition: "all 160ms ease",
};

const toggleCircleEnabledStyle = {
  left: 18,
};

const toggleFieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const smallSelectStyle = {
  height: 30,
  minWidth: 70,
  padding: "0 10px",
  border: "1px solid #CBD5E1",
  borderRadius: 7,
  background: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  color: "#0F172A",
  boxSizing: "border-box",
};

const storageCardStyle = {
  padding: 12,
  borderRadius: 8,
  background: "#F8FAFC",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const storageHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 12,
  fontWeight: 800,
  color: "#0F172A",
};

const storageMetaStyle = {
  fontSize: 11,
  color: "#64748B",
};

const progressBarStyle = {
  width: "100%",
  height: 7,
  borderRadius: 999,
  background: "#E2E8F0",
  overflow: "hidden",
};

const progressValueStyle = {
  width: "62%",
  height: "100%",
  background: "#2563EB",
};

const storageRowsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const storageRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 10,
  color: "#64748B",
};

const systemInfoListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 11,
};

const infoRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
};

const infoLabelStyle = {
  fontSize: 11,
  color: "#64748B",
};

const infoValueStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#0F172A",
  whiteSpace: "nowrap",
};