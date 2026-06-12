import { useEffect, useState } from "react";

import { createPortalWithFirstAdmin } from "../../admin/tenants/portalsApi";
import PlatformModal from "../../../shared/platformModal/PlatformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";

import {
  CONTROL_PLANE_CREATE_COMPANY_MODAL_DEFAULT_BOUNDS,
  CONTROL_PLANE_CREATE_COMPANY_MODAL_KEY,
  CONTROL_PLANE_MODAL_CONTENT_STYLE,
  CONTROL_PLANE_MODAL_VIEWPORT_INSET,
} from "./controlPlaneModalKeys.js";

const CREATE_COMPANY_FORM_ID = "control-plane-create-company-form";

const TENANT_TYPE_OPTIONS = [
  { value: "CLIENT", label: "CLIENT" },
  { value: "DEMO", label: "DEMO" },
  { value: "PARTNER", label: "PARTNER" },
  { value: "TRAINING", label: "TRAINING" },
];

const emptyForm = {
  name: "",
  description: "",
  tenantType: "CLIENT",
  adminFullName: "",
  adminEmail: "",
  adminPhone: "",
  adminPosition: "",
};

function validateForm(form) {
  const errors = {};

  if (!String(form.name || "").trim()) {
    errors.name = "Укажите название компании";
  }

  if (!String(form.adminFullName || "").trim()) {
    errors.adminFullName = "Укажите ФИО администратора";
  }

  if (!String(form.adminEmail || "").trim()) {
    errors.adminEmail = "Укажите email администратора";
  }

  return errors;
}

function FormField({ id, label, required = false, error, children }) {
  return (
    <div className="platform-quick-create-modal__field">
      <label className="platform-quick-create-modal__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="platform-quick-create-modal__required" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <div className="platform-quick-create-modal__control">{children}</div>
      {error ? <p className="platform-quick-create-modal__error">{error}</p> : null}
    </div>
  );
}

export default function CreateCompanyModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm(emptyForm);
      setErrors({});
      setError("");
      setIsSaving(false);
    }
  }, [isOpen]);

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

    try {
      setIsSaving(true);
      setError("");
      const created = await createPortalWithFirstAdmin({
        name: form.name.trim(),
        description: form.description.trim() || null,
        tenant_type: form.tenantType,
        first_admin: {
          full_name: form.adminFullName.trim(),
          email: form.adminEmail.trim(),
          phone: form.adminPhone.trim() || null,
          position: form.adminPosition.trim() || null,
        },
      });
      onCreated?.(created);
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось создать компанию";
      setError(typeof detail === "string" ? detail : "Не удалось создать компанию");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PlatformModal
      modalKey={CONTROL_PLANE_CREATE_COMPANY_MODAL_KEY}
      open={isOpen}
      onClose={onClose}
      title="Создать компанию"
      subtitle="Компании · Клиенты"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CONTROL_PLANE_MODAL_VIEWPORT_INSET}
      defaultBounds={CONTROL_PLANE_CREATE_COMPANY_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Создание компании"
      contentStyle={CONTROL_PLANE_MODAL_CONTENT_STYLE}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Отмена
            </button>
            <button
              type="submit"
              form={CREATE_COMPANY_FORM_ID}
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              disabled={isSaving}
            >
              {isSaving ? "Создание..." : "Создать"}
            </button>
          </div>
        </div>
      }
    >
      <div className="platform-quick-create-modal__body">
        <form
          id={CREATE_COMPANY_FORM_ID}
          className="platform-quick-create-modal__form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="platform-quick-create-modal__fields">
            <h3 className="platform-quick-create-modal__section-title">Компания</h3>

            <FormField id="company-name" label="Название компании" required error={errors.name}>
              <input
                id="company-name"
                className="field-editor-input"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="ООО Ромашка"
                autoFocus
              />
            </FormField>

            <FormField id="company-type" label="Тип компании" required error={errors.tenantType}>
              <select
                id="company-type"
                className="field-editor-input"
                value={form.tenantType}
                onChange={(event) => handleChange("tenantType", event.target.value)}
              >
                {TENANT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="company-description" label="Описание" error={errors.description}>
              <textarea
                id="company-description"
                className="field-editor-input"
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="Комментарий для администратора платформы"
                rows={3}
              />
            </FormField>

            <h3 className="platform-quick-create-modal__section-title">
              Первый администратор компании
            </h3>
            <p className="platform-quick-create-modal__section-hint">
              Этот пользователь будет создан внутри компании и получит полный доступ к её
              управлению. Временный пароль будет сгенерирован автоматически и отправлен на email.
            </p>

            <FormField
              id="admin-full-name"
              label="ФИО"
              required
              error={errors.adminFullName}
            >
              <input
                id="admin-full-name"
                className="field-editor-input"
                value={form.adminFullName}
                onChange={(event) => handleChange("adminFullName", event.target.value)}
              />
            </FormField>

            <FormField id="admin-email" label="Email" required error={errors.adminEmail}>
              <input
                id="admin-email"
                type="email"
                className="field-editor-input"
                value={form.adminEmail}
                onChange={(event) => handleChange("adminEmail", event.target.value)}
              />
            </FormField>

            <FormField id="admin-phone" label="Телефон" error={errors.adminPhone}>
              <input
                id="admin-phone"
                className="field-editor-input"
                value={form.adminPhone}
                onChange={(event) => handleChange("adminPhone", event.target.value)}
              />
            </FormField>

            <FormField id="admin-position" label="Должность" error={errors.adminPosition}>
              <input
                id="admin-position"
                className="field-editor-input"
                value={form.adminPosition}
                onChange={(event) => handleChange("adminPosition", event.target.value)}
              />
            </FormField>

            <div className="platform-quick-create-modal__readonly-role">
              <span className="platform-quick-create-modal__label">Роль</span>
              <span>superadmin</span>
            </div>
            <div className="platform-quick-create-modal__readonly-role">
              <span className="platform-quick-create-modal__label">Статус</span>
              <span>Владелец компании</span>
            </div>
          </div>

          {error ? (
            <p className="platform-quick-create-modal__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </PlatformModal>
  );
}
