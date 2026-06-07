import { buildViewInitialSettingsJson } from "../../utils/buildViewInitialSettingsJson.js";
import { STUDIO_VIEW_TYPES } from "./PlanViewSettingsPanel.jsx";

export const CREATE_OBJECT_VIEW_SECTIONS = [
  { id: "general", label: "Основные настройки" },
  { id: "display", label: "Отображение" },
  { id: "access", label: "Доступ и права" },
];

export const INITIAL_OBJECT_VIEW_CREATE_FORM = {
  name: "",
  key: "",
  key_is_manual: false,
  view_type: "table",
  description: "",
  is_active: true,
};

/**
 * @param {Record<string, unknown>} form
 * @param {string[]} existingViewKeys
 */
export function validateObjectViewCreateForm(form, existingViewKeys = []) {
  const errors = {};
  const name = String(form.name || "").trim();
  const key = String(form.key || "").trim().toLowerCase();
  const viewType = String(form.view_type || "").trim().toLowerCase();

  if (!name) {
    errors.name = "Укажите название вкладки";
  }

  if (!key) {
    errors.key = "Key вкладки будет сгенерирован автоматически";
  } else if (!/^[a-z][a-z0-9_]{2,63}$/.test(key)) {
    errors.key =
      "Key должен начинаться с латинской буквы, быть от 3 до 64 символов (a-z, 0-9, _)";
  } else if (existingViewKeys.includes(key)) {
    errors.key = "Вкладка с таким key уже существует";
  }

  if (!viewType) {
    errors.view_type = "Выберите тип представления";
  } else if (!STUDIO_VIEW_TYPES.includes(viewType)) {
    errors.view_type = "Недопустимый тип представления";
  }

  return errors;
}

/**
 * @param {Record<string, unknown>} form
 */
export function buildObjectViewCreatePayload(form) {
  const viewType = String(form.view_type || "table").trim().toLowerCase();
  const key = String(form.key || "").trim().toLowerCase();

  const payload = {
    name: String(form.name || "").trim(),
    key,
    view_type: viewType,
    description: String(form.description || "").trim() || undefined,
    is_active: form.is_active !== false,
  };

  if (["plan", "quick_form", "form", "card", "list"].includes(viewType)) {
    payload.settings_json = buildViewInitialSettingsJson(key, viewType);
  }

  return payload;
}
