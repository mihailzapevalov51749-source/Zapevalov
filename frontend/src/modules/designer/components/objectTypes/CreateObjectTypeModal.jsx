import { useCallback, useEffect, useMemo, useState } from "react";

import { generateViewKey } from "../../../objectViews/services/generateViewKey";

import "../fields/createFieldModal.css";

const KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const BACKEND_OBJECT_TYPE_KEY_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

const INITIAL_FORM = {
  name: "",
  key: "",
  key_is_manual: false,
  description: "",
};

function validateForm(form, existingKeys) {
  const errors = {};
  const name = String(form.name || "").trim();
  const key = String(form.key || "").trim();

  if (!name) {
    errors.name = "Укажите название объекта";
  }

  if (!key) {
    errors.key = "Укажите key объекта";
  } else if (!KEY_PATTERN.test(key)) {
    errors.key =
      "Key может содержать только латиницу, цифры и _, и начинаться с буквы или _";
  } else {
    const normalizedKey = key.toLowerCase();
    if (!BACKEND_OBJECT_TYPE_KEY_PATTERN.test(normalizedKey)) {
      errors.key =
        "Key должен начинаться с латинской буквы, быть от 3 до 64 символов (a-z, 0-9, _)";
    }
    if (existingKeys.includes(normalizedKey)) {
      errors.key = "Объект с таким key уже существует";
    }
  }

  return errors;
}

function buildCreatePayload(form) {
  const name = String(form.name || "").trim();
  const key = String(form.key || "").trim().toLowerCase();
  const description = String(form.description || "").trim();

  return {
    name,
    key,
    description,
  };
}

export default function CreateObjectTypeModal({
  isOpen = false,
  existingKeys = [],
  isSubmitting = false,
  submitError = "",
  onClose,
  onCreate,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const reservedKeys = useMemo(
    () => existingKeys.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean),
    [existingKeys],
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setErrors({});
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen || form.key_is_manual) {
      return;
    }

    const name = String(form.name || "").trim();
    if (!name) {
      setForm((prev) => (prev.key === "" ? prev : { ...prev, key: "" }));
      return;
    }

    const nextKey = generateViewKey(name, reservedKeys);
    setForm((prev) => (prev.key === nextKey ? prev : { ...prev, key: nextKey }));
  }, [form.key_is_manual, form.name, isOpen, reservedKeys]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    resetForm();
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm(form, reservedKeys);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await onCreate?.(buildCreatePayload(form));
      resetForm();
    } catch {
      // Parent surfaces submitError.
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="designer-create-field-modal__overlay"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="designer-create-field-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="designer-create-object-type-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="designer-create-object-type-modal-title"
          className="designer-create-field-modal__title"
        >
          Создать объект
        </h3>

        <form className="designer-create-field-modal__form" onSubmit={handleSubmit}>
          <label className="designer-label">
            Название объекта
            <input
              className="designer-input"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Например, Задача"
              autoFocus
            />
          </label>
          {errors.name ? (
            <p className="designer-create-field-modal__error">{errors.name}</p>
          ) : null}

          <label className="designer-label">
            Key
            <input
              className="designer-input"
              value={form.key}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  key: event.target.value,
                  key_is_manual: true,
                }))
              }
              placeholder="zadacha"
            />
          </label>
          {!form.key_is_manual ? (
            <p className="designer-create-field-modal__hint">
              Формируется автоматически из названия
            </p>
          ) : null}
          {errors.key ? (
            <p className="designer-create-field-modal__error">{errors.key}</p>
          ) : null}

          <label className="designer-label">
            Описание
            <textarea
              className="designer-textarea"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Необязательно"
              rows={3}
            />
          </label>

          {submitError ? (
            <p className="designer-create-field-modal__error designer-create-field-modal__error--submit">
              {submitError}
            </p>
          ) : null}

          <div className="designer-create-field-modal__actions">
            <button
              type="button"
              className="designer-btn"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="designer-btn designer-btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
