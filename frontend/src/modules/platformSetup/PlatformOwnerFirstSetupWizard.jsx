import { useState } from "react";

import { showPlatformNotification } from "../../shared/platformNotification/PlatformNotification.js";
import { getApiErrorMessage } from "../designer/api/platformApiClient.js";
import { createFirstPlatformOwner } from "./platformSetupApi.js";

import "./platformOwnerFirstSetupWizard.css";

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  position: "",
  password: "",
  password_confirm: "",
};

function validateForm(form) {
  const errors = {};

  if (!String(form.fullName || "").trim()) {
    errors.fullName = "Укажите ФИО";
  }
  if (!String(form.email || "").trim()) {
    errors.email = "Укажите email";
  }
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

  return errors;
}

export default function PlatformOwnerFirstSetupWizard({ onCompleted }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      await createFirstPlatformOwner({
        full_name: String(form.fullName).trim(),
        email: String(form.email).trim(),
        phone: String(form.phone || "").trim() || null,
        position: String(form.position || "").trim() || null,
        password: form.password,
        password_confirm: form.password_confirm,
      });
      showPlatformNotification({
        type: "success",
        message: "Владелец платформы создан",
      });
      onCompleted?.();
    } catch (error) {
      showPlatformNotification({
        type: "error",
        message: getApiErrorMessage(error, "Не удалось создать владельца платформы"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="platform-owner-first-setup">
      <section className="platform-owner-first-setup__card">
        <h1 className="platform-owner-first-setup__title">Добро пожаловать в ЯсноПро</h1>
        <p className="platform-owner-first-setup__subtitle">
          Для начала работы необходимо создать владельца платформы.
        </p>

        <form className="platform-owner-first-setup__form" onSubmit={handleSubmit}>
          {[
            ["fullName", "ФИО", "text"],
            ["email", "Email", "email"],
            ["phone", "Телефон", "text"],
            ["position", "Должность", "text"],
          ].map(([field, label, type]) => (
            <div className="platform-owner-first-setup__field" key={field}>
              <label>{label}</label>
              <input
                type={type}
                value={form[field]}
                onChange={(event) => handleChange(field, event.target.value)}
              />
              {errors[field] ? (
                <div className="platform-owner-first-setup__error">{errors[field]}</div>
              ) : null}
            </div>
          ))}

          {[
            ["password", "Пароль"],
            ["password_confirm", "Подтверждение пароля"],
          ].map(([field, label]) => (
            <div className="platform-owner-first-setup__field" key={field}>
              <label>{label}</label>
              <input
                type="password"
                value={form[field]}
                onChange={(event) => handleChange(field, event.target.value)}
              />
              {errors[field] ? (
                <div className="platform-owner-first-setup__error">{errors[field]}</div>
              ) : null}
            </div>
          ))}

          <button
            type="submit"
            className="platform-owner-first-setup__submit"
            disabled={isSaving}
          >
            {isSaving ? "Создание..." : "Создать владельца платформы"}
          </button>
        </form>
      </section>
    </div>
  );
}
