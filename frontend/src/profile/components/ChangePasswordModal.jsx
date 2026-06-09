import { useCallback, useEffect, useMemo, useState } from "react";

import { changeMyPassword } from "../../api/authApi";
import { PlatformModal } from "../../shared/platformModal";
import "../../modules/designer/styles/designer.css";
import "../../shared/platformModal/platformModalFooter.css";
import "./changePasswordModal.css";

export const CHANGE_PASSWORD_MODAL_KEY = "profile-change-password";

const CHANGE_PASSWORD_MODAL_DEFAULT_BOUNDS = {
  width: 540,
  height: 400,
  minHeight: 300,
};

const CHANGE_PASSWORD_MODAL_CONTENT_STYLE = {
  flex: 1,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
};

const PASSWORD_MODAL_SUBTITLE =
  "Измените пароль для входа в систему ЯсноПро. Для безопасности используйте пароль, который ранее не применялся.";

const EMPTY_FORM = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

function validatePasswordForm(form) {
  const currentPassword = String(form.current_password || "");
  const newPassword = String(form.new_password || "");
  const confirmPassword = String(form.confirm_password || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return "Заполните все поля пароля";
  }

  if (newPassword !== confirmPassword) {
    return "Новый пароль и повтор пароля не совпадают";
  }

  if (newPassword.length < 8) {
    return "Пароль должен содержать не менее 8 символов";
  }

  if (newPassword === currentPassword) {
    return "Новый пароль должен отличаться от текущего";
  }

  return "";
}

export default function ChangePasswordModal({ open = false, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(EMPTY_FORM);
    setError("");
    setSaving(false);
  }, [open]);

  const defaultBounds = useMemo(
    () => ({ ...CHANGE_PASSWORD_MODAL_DEFAULT_BOUNDS }),
    [],
  );

  const handleClose = useCallback(() => {
    if (saving) {
      return;
    }

    onClose?.();
  }, [onClose, saving]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validatePasswordForm(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");

      await changeMyPassword({
        current_password: form.current_password,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });

      setForm(EMPTY_FORM);
      onSuccess?.();
      onClose?.();
    } catch (submitError) {
      setError(submitError?.message || "Не удалось изменить пароль");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PlatformModal
      modalKey={CHANGE_PASSWORD_MODAL_KEY}
      open={open}
      onClose={handleClose}
      title="Смена пароля"
      subtitle={PASSWORD_MODAL_SUBTITLE}
      canCustomizeLayout
      keepFullyVisible
      defaultBounds={defaultBounds}
      contentStyle={CHANGE_PASSWORD_MODAL_CONTENT_STYLE}
      ariaLabel="Смена пароля"
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="designer-btn change-password-modal__footer-btn"
              onClick={handleClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              form="profile-change-password-form"
              className="designer-btn designer-btn--primary change-password-modal__footer-btn"
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      }
    >
      <div className="change-password-modal__scope">
        <div className="change-password-modal__body">
          <form
            id="profile-change-password-form"
            className="change-password-modal__form"
            onSubmit={handleSubmit}
            noValidate
          >
            {error ? (
              <div
                className="change-password-modal__alert change-password-modal__alert--error"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <div className="change-password-modal__fields">
              <div className="change-password-modal__field">
                <label className="designer-label" htmlFor="profile-current-password">
                  Текущий пароль
                </label>
                <input
                  id="profile-current-password"
                  type="password"
                  className="designer-input"
                  value={form.current_password}
                  onChange={(event) =>
                    handleFieldChange("current_password", event.target.value)
                  }
                  placeholder="Введите текущий пароль"
                  autoComplete="current-password"
                  disabled={saving}
                />
              </div>

              <div className="change-password-modal__field">
                <label className="designer-label" htmlFor="profile-new-password">
                  Новый пароль
                </label>
                <input
                  id="profile-new-password"
                  type="password"
                  className="designer-input"
                  value={form.new_password}
                  onChange={(event) =>
                    handleFieldChange("new_password", event.target.value)
                  }
                  placeholder="Введите новый пароль"
                  autoComplete="new-password"
                  disabled={saving}
                />
              </div>

              <div className="change-password-modal__field">
                <label className="designer-label" htmlFor="profile-confirm-password">
                  Повтор нового пароля
                </label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  className="designer-input"
                  value={form.confirm_password}
                  onChange={(event) =>
                    handleFieldChange("confirm_password", event.target.value)
                  }
                  placeholder="Повторите новый пароль"
                  autoComplete="new-password"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="change-password-modal__hint">
              Пароль должен содержать не менее 8 символов и отличаться от текущего
              пароля.
            </div>
          </form>
        </div>
      </div>
    </PlatformModal>
  );
}
