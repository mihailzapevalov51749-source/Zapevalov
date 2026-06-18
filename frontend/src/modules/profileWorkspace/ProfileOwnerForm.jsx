import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { showPlatformNotification } from "../../shared/platformNotification/PlatformNotification.js";
import { getApiErrorMessage } from "../designer/api/platformApiClient.js";
import { buildControlPlaneUsersRolesPath } from "../controlPlane/config/controlPlanePaths.js";
import { mapOwnerFormToApi } from "../controlPlane/platformProfile/platformProfileOwnerMappers.js";
import PlatformRoleBadge from "../controlPlane/platformUsers/PlatformRoleBadge.jsx";
import PlatformUserAvatar from "../controlPlane/platformUsers/PlatformUserAvatar.jsx";
import {
  cardStyle,
  cardTitleStyle,
  fieldLabelStyle,
  fieldWrapperStyle,
  inputStyle,
  saveButtonStyle,
} from "../admin/system/systemSettingsUi.jsx";
import { useProfile } from "./ProfileContext.jsx";
import { isProfileModePlatform } from "./profileMode.js";

import "../controlPlane/platformProfile/platformOwnerForm.css";

function validateOwnerForm(form, isCreate) {
  const errors = {};

  if (!String(form.fullName || "").trim()) {
    errors.fullName = "Укажите ФИО";
  }

  if (!String(form.email || "").trim()) {
    errors.email = "Укажите email";
  }

  if (isCreate) {
    if (!form.password) {
      errors.password = "Укажите пароль";
    }
    if (!form.password_confirm) {
      errors.password_confirm = "Подтвердите пароль";
    }
    if (form.password && form.password_confirm && form.password !== form.password_confirm) {
      errors.password_confirm = "Пароли не совпадают";
    }
    if (form.password && form.password.length < 8) {
      errors.password = "Пароль должен быть не короче 8 символов";
    }
  }

  return errors;
}

function ReadonlyField({ label, value }) {
  return (
    <div style={fieldWrapperStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <input
        value={value}
        readOnly
        className="platform-owner-form__input--readonly"
        style={inputStyle}
      />
    </div>
  );
}

export default function ProfileOwnerForm() {
  const { mode, labels, owner, isSavingOwner, canEditOwner, saveOwner } = useProfile();
  const isPlatform = isProfileModePlatform(mode);
  const [form, setForm] = useState(owner);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(owner);
    setErrors({});
  }, [owner]);

  const isCreate = !form.exists;
  const userCardHref =
    form.userId != null
      ? `${buildControlPlaneUsersRolesPath("users")}?userId=${form.userId}`
      : buildControlPlaneUsersRolesPath("users");

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canEditOwner) {
      return;
    }

    const nextErrors = validateOwnerForm(form, isCreate);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      await saveOwner(mapOwnerFormToApi(form));
      showPlatformNotification({
        type: "success",
        message: isCreate
          ? `${labels.owner} создан`
          : `Данные ${labels.owner.toLowerCase()} сохранены`,
      });
      setForm((previous) => ({
        ...previous,
        password: "",
        password_confirm: "",
        exists: true,
      }));
    } catch (error) {
      showPlatformNotification({
        type: "error",
        message: getApiErrorMessage(error, `Не удалось сохранить ${labels.owner.toLowerCase()}`),
      });
    }
  };

  return (
    <section style={cardStyle} className="platform-owner-form">
      <h2 style={cardTitleStyle}>{labels.owner}</h2>

      {isCreate ? (
        <p className="platform-owner-form__empty-state">{labels.owner} не назначен</p>
      ) : null}

      <form onSubmit={handleSubmit} className="platform-owner-form__body">
        {!isCreate ? (
          <div className="platform-owner-form__avatar-row">
            <PlatformUserAvatar
              user={{
                full_name: form.fullName,
                email: form.email,
                avatar_url: form.avatar_url,
                avatar_settings: form.avatar_settings,
              }}
              size={120}
              className="platform-user-avatar--owner"
            />
          </div>
        ) : null}

        <div style={fieldWrapperStyle}>
          <div style={fieldLabelStyle}>ФИО</div>
          <input
            value={form.fullName}
            onChange={(event) => handleChange("fullName", event.target.value)}
            readOnly={!canEditOwner}
            style={{
              ...inputStyle,
              ...(errors.fullName ? { borderColor: "#DC2626" } : null),
            }}
          />
          {errors.fullName ? (
            <div className="platform-owner-form__error">{errors.fullName}</div>
          ) : null}
        </div>

        <div style={fieldWrapperStyle}>
          <div style={fieldLabelStyle}>Email</div>
          <input
            type="email"
            value={form.email}
            onChange={(event) => handleChange("email", event.target.value)}
            readOnly={!canEditOwner}
            style={{
              ...inputStyle,
              ...(errors.email ? { borderColor: "#DC2626" } : null),
            }}
          />
          {errors.email ? (
            <div className="platform-owner-form__error">{errors.email}</div>
          ) : null}
        </div>

        <div style={fieldWrapperStyle}>
          <div style={fieldLabelStyle}>Телефон</div>
          <input
            value={form.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
            readOnly={!canEditOwner}
            style={inputStyle}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <div style={fieldLabelStyle}>Должность</div>
          <input
            value={form.position || ""}
            onChange={(event) => handleChange("position", event.target.value)}
            readOnly={!canEditOwner}
            style={inputStyle}
          />
        </div>

        {isCreate && canEditOwner ? (
          <>
            <div style={fieldWrapperStyle}>
              <div style={fieldLabelStyle}>Пароль</div>
              <input
                type="password"
                value={form.password}
                onChange={(event) => handleChange("password", event.target.value)}
                style={{
                  ...inputStyle,
                  ...(errors.password ? { borderColor: "#DC2626" } : null),
                }}
              />
              {errors.password ? (
                <div className="platform-owner-form__error">{errors.password}</div>
              ) : null}
            </div>

            <div style={fieldWrapperStyle}>
              <div style={fieldLabelStyle}>Подтверждение пароля</div>
              <input
                type="password"
                value={form.password_confirm}
                onChange={(event) => handleChange("password_confirm", event.target.value)}
                style={{
                  ...inputStyle,
                  ...(errors.password_confirm ? { borderColor: "#DC2626" } : null),
                }}
              />
              {errors.password_confirm ? (
                <div className="platform-owner-form__error">{errors.password_confirm}</div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <ReadonlyField label="Статус" value={form.statusLabel || "—"} />
            <div style={fieldWrapperStyle}>
              <div style={fieldLabelStyle}>Роль</div>
              <div className="platform-owner-form__role-readonly">
                {isPlatform ? (
                  <PlatformRoleBadge roleKey="platform_owner" />
                ) : (
                  <span>{form.roleLabel || "Суперадминистратор"}</span>
                )}
              </div>
            </div>
          </>
        )}

        <div className="platform-owner-form__actions">
          {canEditOwner ? (
            <button type="submit" style={saveButtonStyle} disabled={isSavingOwner}>
              {isCreate ? `Создать ${labels.owner.toLowerCase()}` : labels.saveChanges}
            </button>
          ) : null}

          {!isCreate && isPlatform ? (
            <Link
              to={userCardHref}
              className="platform-owner-form__secondary-btn platform-owner-form__link-btn"
            >
              Открыть карточку пользователя
            </Link>
          ) : null}

          {isPlatform ? (
            <button
              type="button"
              className="platform-owner-form__transfer-stub"
              disabled
              title="Функция будет доступна позже"
            >
              Передать владение платформой
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
