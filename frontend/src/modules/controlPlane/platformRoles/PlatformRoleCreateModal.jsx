import { useEffect, useMemo, useState } from "react";

import PlatformModal from "../../../shared/platformModal/PlatformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";
import { generatePlatformKey } from "../../../shared/keys/generatePlatformKey.js";
import {
  CONTROL_PLANE_MODAL_CONTENT_STYLE,
  CONTROL_PLANE_MODAL_VIEWPORT_INSET,
} from "../companies/controlPlaneModalKeys.js";
import {
  CONTROL_PLANE_CREATE_ROLE_MODAL_DEFAULT_BOUNDS,
  CONTROL_PLANE_CREATE_ROLE_MODAL_KEY,
} from "./controlPlaneRoleModalKeys.js";
import { normalizeRoleKey, validateRoleKey } from "./platformRoleModel.js";

const CREATE_ROLE_FORM_ID = "control-plane-create-role-form";

function validateCreateRoleForm({ label, key, reservedRoleKeys }) {
  const errors = {};
  const trimmedLabel = String(label || "").trim();

  if (!trimmedLabel) {
    errors.label = "Укажите название роли";
  }

  const keyError = validateRoleKey(key, reservedRoleKeys);
  if (keyError) {
    errors.key = keyError;
  }

  return errors;
}

export default function PlatformRoleCreateModal({
  open,
  saving = false,
  reservedRoleKeys = [],
  onClose,
  onSubmit,
}) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyIsManual, setKeyIsManual] = useState(false);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});

  const reservedKeys = useMemo(
    () => reservedRoleKeys.map((item) => normalizeRoleKey(item)).filter(Boolean),
    [reservedRoleKeys],
  );

  useEffect(() => {
    if (!open) {
      setLabel("");
      setKey("");
      setKeyIsManual(false);
      setDescription("");
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!open || keyIsManual) {
      return;
    }

    const trimmedLabel = String(label || "").trim();
    if (!trimmedLabel) {
      setKey((previous) => (previous === "" ? previous : ""));
      return;
    }

    const nextKey = generatePlatformKey(trimmedLabel, reservedKeys);
    setKey((previous) => (previous === nextKey ? previous : nextKey));
  }, [keyIsManual, label, open, reservedKeys]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedLabel = label.trim();
    const roleKey = normalizeRoleKey(key);
    const nextErrors = validateCreateRoleForm({
      label: trimmedLabel,
      key: roleKey,
      reservedRoleKeys: reservedKeys,
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const created = onSubmit?.({
      label: trimmedLabel,
      key: roleKey,
      description: description.trim(),
    });

    if (created === false) {
      setErrors({ form: "Не удалось создать роль" });
    }
  };

  const formError = errors.form;

  return (
    <PlatformModal
      modalKey={CONTROL_PLANE_CREATE_ROLE_MODAL_KEY}
      open={open}
      onClose={onClose}
      title="Создать роль"
      subtitle="Пользователи и роли · Роли"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CONTROL_PLANE_MODAL_VIEWPORT_INSET}
      defaultBounds={CONTROL_PLANE_CREATE_ROLE_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Создание роли"
      contentStyle={CONTROL_PLANE_MODAL_CONTENT_STYLE}
      footer={(
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              form={CREATE_ROLE_FORM_ID}
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Создать роль"}
            </button>
          </div>
        </div>
      )}
    >
      <div className="platform-quick-create-modal__body">
        <form
          id={CREATE_ROLE_FORM_ID}
          className="platform-quick-create-modal__form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="platform-quick-create-modal__fields">
            <div className="platform-quick-create-modal__field">
              <label className="platform-quick-create-modal__label" htmlFor="role-label">
                Название роли
                <span className="platform-quick-create-modal__required" aria-hidden>
                  *
                </span>
              </label>
              <div className="platform-quick-create-modal__control">
                <input
                  id="role-label"
                  className="field-editor-input"
                  value={label}
                  onChange={(event) => {
                    setLabel(event.target.value);
                    if (errors.label) {
                      setErrors((previous) => ({ ...previous, label: undefined }));
                    }
                  }}
                  placeholder="Например, Platform Developer"
                  autoFocus
                />
              </div>
              {errors.label ? (
                <p className="platform-quick-create-modal__error" role="alert">
                  {errors.label}
                </p>
              ) : null}
            </div>

            <div className="platform-quick-create-modal__field">
              <label className="platform-quick-create-modal__label" htmlFor="role-key">
                Код роли
                <span className="platform-quick-create-modal__required" aria-hidden>
                  *
                </span>
              </label>
              <div className="platform-quick-create-modal__control">
                <input
                  id="role-key"
                  className="field-editor-input"
                  value={key}
                  onChange={(event) => {
                    setKey(event.target.value);
                    setKeyIsManual(true);
                    if (errors.key) {
                      setErrors((previous) => ({ ...previous, key: undefined }));
                    }
                  }}
                  placeholder="platform_developer"
                />
              </div>
              {!keyIsManual ? (
                <p className="platform-quick-create-modal__helper">
                  Формируется автоматически из названия
                </p>
              ) : null}
              {errors.key ? (
                <p className="platform-quick-create-modal__error" role="alert">
                  {errors.key}
                </p>
              ) : null}
            </div>

            <div className="platform-quick-create-modal__field">
              <label className="platform-quick-create-modal__label" htmlFor="role-description">
                Описание
              </label>
              <div className="platform-quick-create-modal__control">
                <textarea
                  id="role-description"
                  className="field-editor-input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Краткое описание назначения роли"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {formError ? (
            <p className="platform-quick-create-modal__error" role="alert">
              {formError}
            </p>
          ) : null}
        </form>
      </div>
    </PlatformModal>
  );
}
