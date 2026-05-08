import { useEffect, useRef, useState } from "react";
import { getMe, updateMe, logout, uploadAvatar } from "../../api/authApi";

import settingsIcon from "../../assets/icons/settings.gif";
import saveIcon from "../../assets/icons/save.gif";
import deleteIcon from "../../assets/icons/delet.png";
import updateIcon from "../../assets/icons/update.png";

import cityIcon from "../../assets/icons/city.png";
import emailIcon from "../../assets/icons/email.png";
import phoneIcon from "../../assets/icons/phone.png";
import departmentIcon from "../../assets/icons/department.png";
import bossIcon from "../../assets/icons/boss.png";
import mentorIcon from "../../assets/icons/mentor.png";

import ConfirmSavePopover from "./ConfirmSavePopover";
import { styles } from "../styles/profileSidePanelStyles";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const normalizeAvatarSettings = (settings) => {
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
};

const getAvatarTransform = (settings) => {
  const normalizedSettings = normalizeAvatarSettings(settings);

  return `translate(${normalizedSettings.x}px, ${normalizedSettings.y}px) scale(${normalizedSettings.scale})`;
};

const normalizeUserData = (data) => ({
  ...data,
  city: data?.city || "",
  manager: data?.manager || "",
  mentor: data?.mentor || "",
  avatar_settings: normalizeAvatarSettings(data?.avatar_settings),
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getUserRoleName = (user) => {
  if (!user) return "user";

  if (typeof user.role === "string") return user.role;
  if (typeof user.role_name === "string") return user.role_name;
  if (typeof user.roleName === "string") return user.roleName;

  if (user.role && typeof user.role === "object") {
    return user.role.name || "user";
  }

  return "user";
};

const getUserRoleDescription = (user) => {
  if (!user) return "";

  return (
    user.role_description ||
    user.roleDescription ||
    user.role?.description ||
    ""
  );
};

const quietLogoutButtonStyle = {
  height: 34,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#475569",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const accountHeaderRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 18,
};

const smallPasswordButtonStyle = {
  height: 30,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#475569",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const avatarIconButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

const avatarSmallIconStyle = {
  width: 21,
  height: 21,
  objectFit: "contain",
};

export default function ProfileSidePanel({ isOpen, onClose }) {
  const fileInputRef = useRef(null);
  const avatarCircleRef = useRef(null);
  const dragStateRef = useRef(null);

  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [initialForm, setInitialForm] = useState({});
  const [isEdit, setIsEdit] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [error, setError] = useState("");

  const avatarSettings = normalizeAvatarSettings(form.avatar_settings);

  useEffect(() => {
    if (!isOpen) return;
    loadUser();
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!dragStateRef.current) return;

      event.preventDefault();

      const { startX, startY, initialX, initialY } = dragStateRef.current;

      const nextX = clamp(initialX + event.clientX - startX, -120, 120);
      const nextY = clamp(initialY + event.clientY - startY, -120, 120);

      updateAvatarSettings({
        x: nextX,
        y: nextY,
      });
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const avatarElement = avatarCircleRef.current;
    if (!avatarElement) return;

    const handleWheel = (event) => {
      if (!isEdit || !form.avatar_url) return;

      event.preventDefault();
      event.stopPropagation();

      const direction = event.deltaY > 0 ? -0.06 : 0.06;

      setForm((prev) => {
        const current = normalizeAvatarSettings(prev.avatar_settings);

        return {
          ...prev,
          avatar_settings: {
            ...current,
            scale: clamp(Number((current.scale + direction).toFixed(2)), 1, 3),
          },
        };
      });
    };

    avatarElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      avatarElement.removeEventListener("wheel", handleWheel);
    };
  }, [isEdit, form.avatar_url]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMe();
      const normalizedData = normalizeUserData(data);

      setUser(normalizedData);
      setForm(normalizedData);
      setInitialForm(normalizedData);
      setIsEdit(false);
      setIsConfirmOpen(false);
    } catch {
      setError("Ошибка загрузки профиля");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateAvatarSettings = (nextSettings) => {
    setForm((prev) => ({
      ...prev,
      avatar_settings: {
        ...normalizeAvatarSettings(prev.avatar_settings),
        ...nextSettings,
      },
    }));
  };

  const handleAvatarMouseDown = (event) => {
    if (!isEdit || !form.avatar_url) return;

    event.preventDefault();
    event.stopPropagation();

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      initialX: avatarSettings.x,
      initialY: avatarSettings.y,
    };
  };

  const handleResetAvatarPosition = () => {
    updateAvatarSettings(DEFAULT_AVATAR_SETTINGS);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setError("");
      setIsAvatarUploading(true);

      const result = await uploadAvatar(file);

      setForm((prev) => ({
        ...prev,
        avatar_url: result.absolute_url,
        avatar_settings: DEFAULT_AVATAR_SETTINGS,
      }));
    } catch {
      setError("Ошибка загрузки аватара");
    } finally {
      setIsAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteAvatar = () => {
    setForm((prev) => ({
      ...prev,
      avatar_url: "",
      avatar_settings: DEFAULT_AVATAR_SETTINGS,
    }));
  };

  const hasFormChanges = () => {
    const fields = [
      "full_name",
      "phone",
      "position",
      "department",
      "city",
      "manager",
      "mentor",
      "avatar_url",
      "avatar_settings",
    ];

    return fields.some((field) => {
      if (field === "avatar_settings") {
        return (
          JSON.stringify(normalizeAvatarSettings(form?.avatar_settings)) !==
          JSON.stringify(normalizeAvatarSettings(initialForm?.avatar_settings))
        );
      }

      return String(form?.[field] || "") !== String(initialForm?.[field] || "");
    });
  };

  const handleRequestSave = () => {
    if (!hasFormChanges()) {
      setIsEdit(false);
      setIsConfirmOpen(false);
      setError("");
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleSave = async () => {
    try {
      setError("");

      const updated = await updateMe({
        full_name: form.full_name,
        phone: form.phone,
        position: form.position,
        department: form.department,
        city: form.city,
        manager: form.manager,
        mentor: form.mentor,
        avatar_url: form.avatar_url,
        avatar_settings: normalizeAvatarSettings(form.avatar_settings),
      });

      const normalizedUpdated = normalizeUserData(updated);

      setUser(normalizedUpdated);
      setForm(normalizedUpdated);
      setInitialForm(normalizedUpdated);
      setIsEdit(false);
      setIsConfirmOpen(false);
    } catch {
      setError("Ошибка сохранения");
    }
  };

  const handleCancelEdit = () => {
    setForm(initialForm || user || {});
    setIsEdit(false);
    setIsConfirmOpen(false);
    setError("");
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  if (!isOpen) return null;

  const initials =
    form?.full_name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.full_name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    "?";

  const roleName = getUserRoleName(user);
  const roleDescription = getUserRoleDescription(user);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <aside style={styles.panel} onClick={(event) => event.stopPropagation()}>
        <header style={styles.headerCard}>
          <div>
            <h2 style={styles.title}>Личный кабинет сотрудника</h2>
            <div style={styles.subtitle}>Профиль, контакты, организация</div>
          </div>

          <div style={styles.headerActions}>
            <button
              type="button"
              style={styles.iconButton}
              title={isEdit ? "Сохранить изменения" : "Редактировать"}
              onClick={isEdit ? handleRequestSave : () => setIsEdit(true)}
            >
              <img
                src={isEdit ? saveIcon : settingsIcon}
                alt={isEdit ? "Сохранить" : "Настройки"}
                style={styles.actionIcon}
              />
            </button>

            <button type="button" onClick={onClose} style={styles.closeButton}>
              ×
            </button>
          </div>
        </header>

        {loading && <div style={styles.message}>Загрузка...</div>}
        {!loading && error && <div style={styles.errorMessage}>{error}</div>}

        {!loading && user && (
          <div
            style={{
              ...styles.contentGrid,
              alignItems: "stretch",
            }}
          >
            <section
              style={{
                ...styles.leftColumn,
                gap: 16,
                height: "100%",
              }}
            >
              <div
                style={{
                  ...styles.avatarCard,
                  minHeight: 278,
                  boxSizing: "border-box",
                }}
              >
                <div
                  ref={avatarCircleRef}
                  style={{
                    ...styles.avatarCircle,
                    cursor: isEdit && form.avatar_url ? "grab" : "default",
                  }}
                  onMouseDown={handleAvatarMouseDown}
                  title={
                    isEdit && form.avatar_url
                      ? "Перетащи фото внутри круга. Масштаб меняется колесиком мыши."
                      : ""
                  }
                >
                  <span style={styles.avatarOnlineDot} />

                  {form.avatar_url ? (
                    <div style={styles.avatarViewport}>
                      <img
                        src={form.avatar_url}
                        alt="Аватар"
                        draggable={false}
                        style={{
                          ...styles.avatarImg,
                          transform: getAvatarTransform(avatarSettings),
                          transformOrigin: "center center",
                          transition: dragStateRef.current
                            ? "none"
                            : "transform 0.08s ease",
                        }}
                      />
                    </div>
                  ) : (
                    <span style={styles.avatarLetter}>{initials}</span>
                  )}
                </div>

                {isEdit && (
                  <>
                    <div
                      style={{
                        ...styles.avatarActionsRow,
                        marginTop: 18,
                        justifyContent: "center",
                        gap: 10,
                      }}
                    >
                      <button
                        type="button"
                        style={styles.uploadButton}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAvatarUploading}
                      >
                        {isAvatarUploading
                          ? "Загрузка..."
                          : form.avatar_url
                          ? "Заменить фото"
                          : "Загрузить фото"}
                      </button>

                      {form.avatar_url && !isAvatarUploading && (
                        <button
                          type="button"
                          style={avatarIconButtonStyle}
                          onClick={handleResetAvatarPosition}
                          title="Сбросить положение фото"
                        >
                          <img
                            src={updateIcon}
                            alt="Сбросить"
                            style={avatarSmallIconStyle}
                          />
                        </button>
                      )}

                      {form.avatar_url && !isAvatarUploading && (
                        <button
                          type="button"
                          style={avatarIconButtonStyle}
                          onClick={handleDeleteAvatar}
                          title="Удалить фото"
                        >
                          <img
                            src={deleteIcon}
                            alt="Удалить фото"
                            style={avatarSmallIconStyle}
                          />
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleAvatarUpload}
                    />
                  </>
                )}
              </div>

              <div
                style={{
                  ...styles.accountCard,
                  flex: 1,
                  minHeight: 0,
                  boxSizing: "border-box",
                }}
              >
                <div style={accountHeaderRowStyle}>
                  <div style={styles.accountTitle}>АККАУНТ</div>

                  {isEdit && (
                    <button type="button" style={smallPasswordButtonStyle}>
                      Сменить пароль
                    </button>
                  )}
                </div>

                <div style={styles.accountRow}>
                  <span style={styles.accountLabel}>Статус</span>
                  <span style={styles.statusValue}>
                    <span style={styles.onlineDot} />
                    {user.is_active ? "Активен" : "Отключён"}
                  </span>
                </div>

                <div style={styles.accountRow}>
                  <span style={styles.accountLabel}>Роль</span>
                  <span style={styles.accountValue}>{roleName}</span>
                </div>

                {roleDescription && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "#64748b",
                    }}
                  >
                    {roleDescription}
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                ...styles.mainCard,
                height: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  ...styles.profileHeader,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  {isEdit ? (
                    <InlineInput
                      value={form.full_name}
                      onChange={(v) => handleChange("full_name", v)}
                      placeholder="ФИО"
                      large
                    />
                  ) : (
                    <h3 style={styles.employeeName}>
                      {user.full_name || "Пользователь"}
                    </h3>
                  )}

                  {isEdit ? (
                    <InlineInput
                      value={form.position}
                      onChange={(v) => handleChange("position", v)}
                      placeholder="Должность"
                    />
                  ) : (
                    <div style={styles.employeeRole}>
                      {user.position || "Должность не указана"}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  style={quietLogoutButtonStyle}
                  onClick={handleLogout}
                >
                  Выйти из профиля
                </button>
              </div>

              <div style={styles.mainDivider} />

              <div style={styles.tabs}>
                <div style={styles.tabActive}>Контакты</div>
                <div style={styles.tab}>Организация</div>
              </div>

              <div style={styles.tabDivider} />

              <div style={styles.infoGrid}>
                <InfoTile
                  icon={cityIcon}
                  label="Город"
                  value={form.city || "Не указан"}
                  editable={isEdit}
                  onChange={(v) => handleChange("city", v)}
                />

                <InfoTile
                  icon={departmentIcon}
                  label="Подразделение"
                  value={form.department || "Не указано"}
                  editable={isEdit}
                  onChange={(v) => handleChange("department", v)}
                />

                <InfoTile icon={emailIcon} label="E-mail" value={form.email} />

                <InfoTile
                  icon={bossIcon}
                  label="Руководитель"
                  value={form.manager || "Не указан"}
                  editable={isEdit}
                  onChange={(v) => handleChange("manager", v)}
                />

                <InfoTile
                  icon={phoneIcon}
                  label="Телефон"
                  value={form.phone || "Не указан"}
                  editable={isEdit}
                  onChange={(v) => handleChange("phone", v)}
                />

                <InfoTile
                  icon={mentorIcon}
                  label="Наставник"
                  value={form.mentor || "Не указан"}
                  editable={isEdit}
                  onChange={(v) => handleChange("mentor", v)}
                />
              </div>
            </section>
          </div>
        )}

        {isConfirmOpen && (
          <ConfirmSavePopover
            onConfirm={handleSave}
            onCancel={() => setIsConfirmOpen(false)}
            onReject={handleCancelEdit}
          />
        )}
      </aside>
    </div>
  );
}

function InlineInput({ value, onChange, placeholder, large }) {
  return (
    <input
      value={value || ""}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      style={{
        ...styles.inlineInput,
        height: large ? 42 : 34,
        fontSize: large ? 28 : 18,
        fontWeight: large ? 900 : 700,
      }}
    />
  );
}

function InfoTile({ icon, label, value, editable, onChange }) {
  return (
    <div style={styles.infoTile}>
      <div style={styles.infoIcon}>
        <img
          src={icon}
          alt=""
          style={{
            width: 17,
            height: 17,
            objectFit: "contain",
          }}
        />
      </div>

      <div style={styles.infoContent}>
        <div style={styles.infoTileLabel}>{label}</div>

        {editable ? (
          <input
            value={
              value === "Не указан" || value === "Не указано" ? "" : value || ""
            }
            onChange={(event) => onChange?.(event.target.value)}
            style={styles.infoTileInput}
          />
        ) : (
          <div style={styles.infoTileValue}>{value || "Не указан"}</div>
        )}
      </div>
    </div>
  );
}