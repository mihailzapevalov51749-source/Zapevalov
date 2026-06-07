import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, Monitor, Shield } from "lucide-react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import PlatformModal from "../../../../shared/platformModal/PlatformModal";
import PlatformModalHelp from "../../../../shared/platformModal/PlatformModalHelp";
import { generateViewKey } from "../../../objectViews/services/generateViewKey";

import {
  resolveStudioViewTypeLabel,
  STUDIO_VIEW_TYPES,
} from "./PlanViewSettingsPanel.jsx";
import {
  CREATE_OBJECT_VIEW_MODAL_KEY,
  CREATE_OBJECT_VIEW_MODAL_MIN_HEIGHT,
  CREATE_OBJECT_VIEW_MODAL_MIN_WIDTH,
  CREATE_OBJECT_VIEW_MODAL_SIZE,
  CREATE_OBJECT_VIEW_MODAL_VIEWPORT_INSET,
} from "./createObjectViewModalKeys.js";
import {
  buildObjectViewCreatePayload,
  CREATE_OBJECT_VIEW_SECTIONS,
  INITIAL_OBJECT_VIEW_CREATE_FORM,
  validateObjectViewCreateForm,
} from "./createObjectViewModalUtils.js";

import "./createObjectViewModal.css";

const CREATE_OBJECT_VIEW_HELP = {
  title: "Создание вкладки",
  description:
    "Вкладка определяет, как будут отображаться записи объекта в Studio и Office. Укажите название вкладки и тип представления. Ключ вкладки создаётся автоматически на основе названия.",
};

const MODAL_CONTENT_STYLE = {
  flex: 1,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
};

const SECTION_ICONS = {
  general: LayoutGrid,
  display: Monitor,
  access: Shield,
};

function FormField({ label, required = false, helper = "", error = "", children }) {
  return (
    <div className="designer-create-object-view-modal__field">
      <div className="designer-create-object-view-modal__label-row">
        <label className="designer-label">{label}</label>
        {required ? (
          <span className="designer-create-object-view-modal__required" aria-hidden>
            *
          </span>
        ) : null}
      </div>
      {children}
      {helper ? (
        <p className="designer-create-object-view-modal__helper">{helper}</p>
      ) : null}
      {error ? (
        <p className="designer-create-object-view-modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function CreateObjectViewModal({
  open = false,
  tenantId = null,
  objectTypeId = null,
  objectTypeName = "",
  existingViewKeys = [],
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(INITIAL_OBJECT_VIEW_CREATE_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

  const reservedKeys = useMemo(
    () =>
      existingViewKeys
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean),
    [existingViewKeys],
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_OBJECT_VIEW_CREATE_FORM);
    setErrors({});
    setSubmitError("");
    setActiveSection("general");
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || form.key_is_manual) {
      return;
    }

    const name = String(form.name || "").trim();

    if (!name) {
      setForm((prev) => (prev.key === "" ? prev : { ...prev, key: "" }));
      return;
    }

    const nextKey = generateViewKey(name, reservedKeys);
    setForm((prev) => (prev.key === nextKey ? prev : { ...prev, key: nextKey }));
  }, [form.key_is_manual, form.name, open, reservedKeys]);

  const canSubmit = useMemo(() => {
    const validationErrors = validateObjectViewCreateForm(form, reservedKeys);
    return (
      Object.keys(validationErrors).length === 0 &&
      !isSubmitting &&
      Boolean(tenantId && objectTypeId)
    );
  }, [form, isSubmitting, objectTypeId, reservedKeys, tenantId]);

  const objectLabel = String(objectTypeName || "").trim() || "объекта";

  const defaultBounds = useMemo(
    () => ({
      width: CREATE_OBJECT_VIEW_MODAL_SIZE.width,
      height: CREATE_OBJECT_VIEW_MODAL_SIZE.height,
      minWidth: CREATE_OBJECT_VIEW_MODAL_MIN_WIDTH,
      minHeight: CREATE_OBJECT_VIEW_MODAL_MIN_HEIGHT,
    }),
    [],
  );

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();

    const nextErrors = validateObjectViewCreateForm(form, reservedKeys);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      setActiveSection("general");
      return;
    }

    if (!tenantId || !objectTypeId) {
      setSubmitError("Не задан тип объекта");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await designerApi.createView(
        tenantId,
        objectTypeId,
        buildObjectViewCreatePayload(form),
      );
      onCreated?.(created);
      resetForm();
      onClose?.();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Не удалось создать вкладку"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGeneralSection = () => (
    <>
      <FormField
        label="Название вкладки"
        required
        error={errors.name}
      >
        <input
          className="designer-input"
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
          placeholder="Введите название вкладки"
          autoFocus
        />
      </FormField>

      <FormField
        label="Key вкладки"
        helper="Уникальный идентификатор для системы. Используется в API и настройках."
        error={errors.key}
      >
        <input
          className="designer-input designer-create-object-view-modal__key-input"
          value={form.key}
          readOnly={!form.key_is_manual}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              key: event.target.value,
              key_is_manual: true,
            }))
          }
          placeholder="my_custom_tab"
        />
      </FormField>

      <FormField
        label="Тип представления"
        required
        helper="Определяет, как будут отображаться записи объекта на вкладке."
        error={errors.view_type}
      >
        <select
          className="designer-select"
          value={form.view_type}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, view_type: event.target.value }))
          }
        >
          {STUDIO_VIEW_TYPES.map((type) => (
            <option key={type} value={type}>
              {resolveStudioViewTypeLabel(type)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Описание">
        <textarea
          className="designer-textarea"
          rows={3}
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
          placeholder="Краткое описание назначения вкладки"
        />
      </FormField>

      <div className="designer-create-object-view-modal__toggle-row">
        <div className="designer-create-object-view-modal__toggle-copy">
          <p className="designer-create-object-view-modal__toggle-title">Активная вкладка</p>
          <p className="designer-create-object-view-modal__helper">
            Вкладка будет доступна пользователям после сохранения и публикации объекта.
          </p>
        </div>
        <label className="designer-view-form__checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, is_active: event.target.checked }))
            }
          />
        </label>
      </div>
    </>
  );

  const renderSectionContent = () => {
    if (activeSection === "display") {
      return (
        <p className="designer-create-object-view-modal__placeholder">
          Настройки отображения (колонки, projection, параметры «План» и др.) доступны в
          панели свойств вкладки после создания.
        </p>
      );
    }

    if (activeSection === "access") {
      return (
        <p className="designer-create-object-view-modal__placeholder">
          Настройки доступа будут добавлены позже.
        </p>
      );
    }

    return renderGeneralSection();
  };

  return (
    <PlatformModal
      modalKey={CREATE_OBJECT_VIEW_MODAL_KEY}
      open={open}
      onClose={handleClose}
      title="Новая вкладка"
      subtitle={`Создайте новую вкладку для объекта «${objectLabel}»`}
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CREATE_OBJECT_VIEW_MODAL_VIEWPORT_INSET}
      defaultBounds={defaultBounds}
      ariaLabel="Создание вкладки объекта"
      contentStyle={MODAL_CONTENT_STYLE}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading">
            <PlatformModalHelp
              title={CREATE_OBJECT_VIEW_HELP.title}
              description={CREATE_OBJECT_VIEW_HELP.description}
            />
          </div>
          <div className="platform-modal-footer__actions">
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
              form="designer-create-object-view-form"
              className="designer-btn designer-btn--primary"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Создать вкладку"}
            </button>
          </div>
        </div>
      }
    >
      <div className="designer-create-object-view-modal__layout">
        <nav
          className="designer-create-object-view-modal__sidebar"
          aria-label="Разделы настройки вкладки"
        >
          {CREATE_OBJECT_VIEW_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.id] || LayoutGrid;

            return (
              <button
                key={section.id}
                type="button"
                className={`designer-create-object-view-modal__nav-item${
                  activeSection === section.id ? " is-active" : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="designer-create-object-view-modal__nav-icon" aria-hidden>
                  <Icon size={16} strokeWidth={2} />
                </span>
                {section.label}
              </button>
            );
          })}
        </nav>

        <div className="designer-create-object-view-modal__content">
          <form
            id="designer-create-object-view-form"
            className="designer-create-object-view-modal__form"
            onSubmit={handleSubmit}
            noValidate
          >
            {renderSectionContent()}

            {submitError ? (
              <p className="designer-create-object-view-modal__error" role="alert">
                {submitError}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </PlatformModal>
  );
}
