import { useEffect, useMemo, useState } from "react";
import { styles } from "./usersStyles";

const API_BASE_URL = "http://127.0.0.1:8010";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const PROFILE_AVATAR_SIZE = 132;

const CITY_OPTIONS = [
  "Санкт-Петербург",
  "Москва",
  "Новосибирск",
  "Екатеринбург",
  "Казань",
  "Нижний Новгород",
  "Челябинск",
  "Красноярск",
  "Самара",
  "Уфа",
  "Ростов-на-Дону",
  "Омск",
  "Краснодар",
  "Воронеж",
  "Пермь",
  "Волгоград",
  "Саратов",
  "Тюмень",
  "Тольятти",
  "Ижевск",
  "Барнаул",
  "Ульяновск",
  "Иркутск",
  "Хабаровск",
  "Ярославль",
  "Владивосток",
  "Махачкала",
  "Томск",
  "Оренбург",
  "Кемерово",
  "Новокузнецк",
  "Рязань",
  "Астрахань",
  "Пенза",
  "Липецк",
  "Киров",
  "Чебоксары",
  "Калининград",
  "Балашиха",
  "Тула",
  "Курск",
  "Севастополь",
  "Сочи",
  "Ставрополь",
  "Улан-Удэ",
  "Тверь",
  "Магнитогорск",
  "Иваново",
  "Брянск",
  "Белгород",
  "Сургут",
  "Владимир",
  "Нижний Тагил",
  "Архангельск",
  "Чита",
  "Симферополь",
  "Калуга",
  "Смоленск",
  "Волжский",
  "Якутск",
  "Саранск",
  "Череповец",
  "Курган",
  "Вологда",
  "Орёл",
  "Владикавказ",
  "Подольск",
  "Грозный",
  "Мурманск",
  "Тамбов",
  "Петрозаводск",
  "Стерлитамак",
  "Кострома",
  "Новороссийск",
  "Йошкар-Ола",
  "Химки",
  "Таганрог",
  "Комсомольск-на-Амуре",
  "Сыктывкар",
  "Нальчик",
  "Шахты",
  "Дзержинск",
  "Нижневартовск",
  "Братск",
  "Орск",
  "Энгельс",
  "Ангарск",
  "Благовещенск",
  "Старый Оскол",
  "Великий Новгород",
  "Королёв",
  "Псков",
  "Мытищи",
  "Бийск",
  "Люберцы",
  "Прокопьевск",
  "Южно-Сахалинск",
  "Балаково",
  "Армавир",
  "Рыбинск",
  "Абакан",
  "Северодвинск",
  "Петропавловск-Камчатский",
  "Норильск",
  "Уссурийск",
  "Волгодонск",
  "Сызрань",
  "Новочеркасск",
  "Златоуст",
  "Электросталь",
  "Альметьевск",
  "Салават",
  "Миасс",
  "Копейск",
  "Пятигорск",
  "Находка",
  "Рубцовск",
  "Березники",
  "Коломна",
  "Майкоп",
  "Ковров",
  "Одинцово",
  "Кисловодск",
  "Серпухов",
  "Новомосковск",
  "Нефтекамск",
  "Димитровград",
  "Нефтеюганск",
  "Первоуральск",
  "Каспийск",
  "Новый Уренгой",
  "Ессентуки",
  "Обнинск",
  "Жуковский",
  "Каменск-Уральский",
  "Елец",
  "Пушкино",
  "Артём",
  "Муром",
  "Новошахтинск",
  "Северск",
  "Реутов",
  "Ноябрьск",
  "Бердск",
  "Хасавюрт",
  "Долгопрудный",
  "Железнодорожный",
  "Евпатория",
  "Новочебоксарск",
  "Черкесск",
  "Камышин",
  "Назрань",
  "Ачинск",
  "Тобольск",
  "Сергиев Посад",
  "Мичуринск",
  "Киселёвск",
  "Глазов",
  "Канск",
  "Соликамск",
  "Сарапул",
  "Ногинск",
  "Воткинск",
  "Невинномысск",
  "Дербент",
  "Гатчина",
];

function getToken() {
  return localStorage.getItem("token");
}

async function sendUserInvite(userId) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Ошибка отправки приглашения");
  }

  return response.json();
}

function normalizeAvatarSettings(settings) {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

  if (typeof settings === "string") {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
}

function getAvatarTransform(settings, size) {
  const s = normalizeAvatarSettings(settings);
  const ratio = size / PROFILE_AVATAR_SIZE;

  return `translate(${(s.x || 0) * ratio}px, ${
    (s.y || 0) * ratio
  }px) scale(${s.scale || 1})`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function highlightMatch(text, query) {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return text;

  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + normalizedQuery.length);
  const after = text.slice(index + normalizedQuery.length);

  return (
    <>
      {before}
      <span style={cardStyles.autocompleteHighlight}>{match}</span>
      {after}
    </>
  );
}

export default function UserEditorCard({
  user,
  roles = [],
  onChange,
  onSave,
  onDelete,
  onClose,
  saving = false,
  deleting = false,
}) {
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    setInviteSent(false);
    setInviteError("");
  }, [user?.id]);

  const canSendInvite = Boolean(
    user?.id && !user?.isNew && user?.email && user?.temp_password
  );

  const canDeleteUser = Boolean(user?.id && !user?.isNew && onDelete);

  const roleDescription =
    roles.find((role) => Number(role.id) === Number(user?.role_id))
      ?.description || "Описание роли не указано.";

  const handleSendInvite = async () => {
    if (!user?.id || !canSendInvite) return;

    try {
      setInviteSending(true);
      setInviteError("");

      await sendUserInvite(user.id);

      setInviteSent(true);
    } catch (error) {
      console.error(error);
      setInviteError("Не удалось отправить приглашение.");
      setInviteSent(false);
    } finally {
      setInviteSending(false);
    }
  };

  if (!user || (!user.id && !user.isNew)) {
    return (
      <div style={styles.emptyEditor}>
        <div style={styles.emptyEditorTitle}>Выберите пользователя</div>
      </div>
    );
  }

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.header}>
        <div style={cardStyles.profileLine}>
          <Avatar user={user} size={52} />

          <div style={cardStyles.profileText}>
            <div style={cardStyles.kicker}>
              {user.isNew ? "Создание пользователя" : "Карточка пользователя"}
            </div>

            <div style={cardStyles.title}>
              {user.full_name || "Новый пользователь"}
            </div>

            <div style={cardStyles.subtitle}>
              {user.position || "Должность не указана"}
            </div>
          </div>
        </div>

        {onClose && (
          <button type="button" onClick={onClose} style={cardStyles.closeButton}>
            ×
          </button>
        )}
      </div>

      <div style={cardStyles.formGrid}>
        <Field
          label="ФИО"
          value={user.full_name}
          onChange={(value) => onChange("full_name", value)}
        />

        <Field
          label="E-mail"
          value={user.email}
          disabled={!user.isNew}
          onChange={(value) => onChange("email", value)}
        />

        <Field
          label="Телефон"
          value={user.phone}
          onChange={(value) => onChange("phone", value)}
        />

        <CityAutocomplete
          value={user.city}
          onChange={(value) => onChange("city", value)}
        />

        <Field
          label="Должность"
          value={user.position}
          onChange={(value) => onChange("position", value)}
        />

        <Field
          label="Подразделение"
          value={user.department}
          onChange={(value) => onChange("department", value)}
        />

        <Field
          label="Руководитель"
          value={user.manager}
          onChange={(value) => onChange("manager", value)}
        />

        <Field
          label="Наставник"
          value={user.mentor}
          onChange={(value) => onChange("mentor", value)}
        />

        <label style={cardStyles.field}>
          <span style={cardStyles.label}>Роль</span>
          <select
            value={user.role_id || ""}
            onChange={(event) =>
              onChange("role_id", Number(event.target.value))
            }
            style={cardStyles.input}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>

        <label style={cardStyles.field}>
          <span style={cardStyles.label}>Статус</span>
          <select
            value={user.is_active ? "active" : "inactive"}
            onChange={(event) =>
              onChange("is_active", event.target.value === "active")
            }
            style={cardStyles.input}
          >
            <option value="active">Активен</option>
            <option value="inactive">Отключён</option>
          </select>
        </label>

        <Field
          label={user.isNew ? "Пароль" : "Новый пароль"}
          value={user.password}
          type="password"
          placeholder={
            user.isNew
              ? "Можно оставить пустым"
              : "Заполните только для смены"
          }
          onChange={(value) => onChange("password", value)}
        />

        <Field
          label="Повтор пароля"
          value={user.password_repeat}
          type="password"
          placeholder="Повторите пароль"
          onChange={(value) => onChange("password_repeat", value)}
        />
      </div>

      <div style={cardStyles.passwordHint}>
        {user.isNew
          ? "Если пароль не указать, система создаст временный пароль автоматически."
          : "Если пароль не заполнять, текущий пароль пользователя не изменится."}
      </div>

      <div style={cardStyles.roleDescription}>{roleDescription}</div>

      {inviteError && <div style={cardStyles.inviteError}>{inviteError}</div>}

      {inviteSent && (
        <div style={cardStyles.inviteSuccess}>
          Приглашение отправлено на E-mail: {user.email}
        </div>
      )}

      <div style={cardStyles.actions}>
        <div style={cardStyles.leftActions}>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || deleting}
            style={{
              ...cardStyles.primaryButton,
              ...(saving || deleting ? cardStyles.buttonDisabled : {}),
            }}
          >
            {saving ? "Сохранение..." : user.isNew ? "Создать" : "Сохранить"}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              style={{
                ...cardStyles.secondaryButton,
                ...(saving || deleting ? cardStyles.buttonDisabled : {}),
              }}
            >
              Отмена
            </button>
          )}

          {canSendInvite && (
            <button
              type="button"
              onClick={handleSendInvite}
              disabled={inviteSending || saving || deleting}
              style={{
                ...cardStyles.shareButton,
                ...(inviteSending || saving || deleting
                  ? cardStyles.buttonDisabled
                  : {}),
              }}
            >
              {inviteSending
                ? "Отправка..."
                : inviteSent
                ? "Отправлено"
                : "Отправить"}
            </button>
          )}
        </div>

        {canDeleteUser && (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving || deleting}
            style={{
              ...cardStyles.deleteButton,
              ...(saving || deleting ? cardStyles.buttonDisabled : {}),
            }}
          >
            {deleting ? "Удаление..." : "Удалить"}
          </button>
        )}
      </div>
    </div>
  );
}

function Avatar({ user, size }) {
  const initials =
    user?.full_name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "?";

  return (
    <div style={{ ...cardStyles.avatar, width: size, height: size }}>
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
            transform: getAvatarTransform(user.avatar_settings, size),
            transformOrigin: "center center",
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
  placeholder = "",
}) {
  return (
    <label style={cardStyles.field}>
      <span style={cardStyles.label}>{label}</span>

      <input
        type={type}
        value={value || ""}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={type === "password" ? "new-password" : "off"}
        onChange={(event) => onChange?.(event.target.value)}
        style={{
          ...cardStyles.input,
          ...(disabled ? cardStyles.inputDisabled : {}),
        }}
      />
    </label>
  );
}

function CityAutocomplete({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const query = normalizeText(value);

  const filteredCities = useMemo(() => {
    if (!query) return [];

    return CITY_OPTIONS.filter((city) =>
      normalizeText(city).includes(query)
    ).slice(0, 8);
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelectCity = (city) => {
    onChange?.(city);
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!isOpen || filteredCities.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev >= filteredCities.length - 1 ? 0 : prev + 1
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? filteredCities.length - 1 : prev - 1
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleSelectCity(filteredCities[activeIndex]);
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <label style={cardStyles.field}>
      <span style={cardStyles.label}>Город</span>

      <div style={cardStyles.autocompleteWrapper}>
        <input
          value={value || ""}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            onChange?.(event.target.value);
            setIsOpen(true);
          }}
          placeholder="Начните вводить город"
          style={cardStyles.input}
        />

        {isOpen && query && filteredCities.length > 0 && (
          <div style={cardStyles.autocompleteDropdown}>
            {filteredCities.map((city, index) => (
              <button
                key={`${city}-${index}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelectCity(city);
                }}
                style={{
                  ...cardStyles.autocompleteOption,
                  ...(index === activeIndex
                    ? cardStyles.autocompleteOptionActive
                    : {}),
                }}
              >
                {highlightMatch(city, query)}
              </button>
            ))}
          </div>
        )}

        {isOpen && query && filteredCities.length === 0 && (
          <div style={cardStyles.autocompleteDropdown}>
            <div style={cardStyles.autocompleteEmpty}>
              Город не найден в локальном списке
            </div>
          </div>
        )}
      </div>
    </label>
  );
}

const cardStyles = {
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    boxSizing: "border-box",
    minHeight: 520,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },

  profileLine: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    minWidth: 0,
  },

  profileText: {
    minWidth: 0,
  },

  kicker: {
    fontSize: 12,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#2563eb",
    marginBottom: 5,
  },

  title: {
    fontSize: 21,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 1.15,
    color: "#64748b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: 12,
    rowGap: 12,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0,
  },

  label: {
    fontSize: 12,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#475569",
  },

  input: {
    width: "100%",
    minWidth: 0,
    height: 34,
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    padding: "0 9px",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    outline: "none",
  },

  inputDisabled: {
    background: "#f1f5f9",
    color: "#64748b",
  },

  autocompleteWrapper: {
    position: "relative",
    minWidth: 0,
  },

  autocompleteDropdown: {
    position: "absolute",
    top: "calc(100% + 5px)",
    left: 0,
    right: 0,
    zIndex: 50,
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.16)",
    overflow: "hidden",
    maxHeight: 238,
  },

  autocompleteOption: {
    width: "100%",
    minHeight: 34,
    padding: "8px 10px",
    border: "none",
    borderBottom: "1px solid #f1f5f9",
    background: "#ffffff",
    color: "#0f172a",
    textAlign: "left",
    fontSize: 13,
    lineHeight: 1.25,
    cursor: "pointer",
  },

  autocompleteOptionActive: {
    background: "#f1f5f9",
  },

  autocompleteHighlight: {
    fontWeight: 900,
    color: "#0ea5e9",
  },

  autocompleteEmpty: {
    padding: "10px",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.3,
    background: "#ffffff",
  },

  passwordHint: {
    marginTop: 10,
    padding: "8px 10px",
    borderRadius: 10,
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.35,
  },

  roleDescription: {
    marginTop: 12,
    padding: "9px 10px",
    borderRadius: 10,
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.35,
  },

  inviteSuccess: {
    marginTop: 12,
    padding: "9px 10px",
    borderRadius: 10,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 700,
  },

  inviteError: {
    marginTop: 12,
    padding: "9px 10px",
    borderRadius: 10,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 700,
  },

  actions: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  leftActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  primaryButton: {
    height: 36,
    padding: "0 14px",
    borderRadius: 9,
    border: "1px solid #0ea5e9",
    background: "#0ea5e9",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  secondaryButton: {
    height: 36,
    padding: "0 14px",
    borderRadius: 9,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  shareButton: {
    height: 36,
    padding: "0 14px",
    borderRadius: 9,
    border: "1px solid #16a34a",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  deleteButton: {
    height: 36,
    padding: "0 14px",
    borderRadius: 9,
    border: "1px solid #ef4444",
    background: "#ffffff",
    color: "#dc2626",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },

  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  avatar: {
    borderRadius: "50%",
    overflow: "hidden",
    background: "#e0f2fe",
    color: "#0369a1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    lineHeight: 1,
    flexShrink: 0,
  },
};