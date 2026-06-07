import { PLAN_ROLE_KEYS } from "./objectViewRoleMapping.js";

/**
 * @typedef {Object} ViewRoleDefinition
 * @property {string} roleKey
 * @property {string} label
 * @property {string} [hint]
 */

/** @type {Record<string, ViewRoleDefinition[]>} */
export const VIEW_TYPE_ROLE_DEFINITIONS = {
  plan: [
    { roleKey: PLAN_ROLE_KEYS.NODE_TITLE, label: "Название узла" },
    { roleKey: PLAN_ROLE_KEYS.NODE_STATUS, label: "Статус узла" },
    { roleKey: PLAN_ROLE_KEYS.NODE_DESCRIPTION, label: "Описание узла" },
    {
      roleKey: PLAN_ROLE_KEYS.NEXT_STEPS,
      label: "Следующие шаги",
      hint: "Текстовое поле элемента плана (не задачи Задачника).",
    },
  ],
  board: [
    { roleKey: "cardTitle", label: "Заголовок карточки" },
    { roleKey: "columnField", label: "Поле колонок" },
  ],
  calendar: [
    { roleKey: "eventTitle", label: "Заголовок события" },
    { roleKey: "startDate", label: "Дата начала" },
    { roleKey: "endDate", label: "Дата окончания" },
  ],
  card: [
    { roleKey: "heroTitle", label: "Заголовок карточки" },
    { roleKey: "heroStatus", label: "Статус" },
    { roleKey: "heroOwner", label: "Ответственный" },
    { roleKey: "heroDueDate", label: "Срок" },
  ],
};

/**
 * @param {string} viewType
 * @returns {ViewRoleDefinition[]}
 */
export function resolveViewTypeRoleDefinitions(viewType) {
  const key = String(viewType || "").trim().toLowerCase();
  return VIEW_TYPE_ROLE_DEFINITIONS[key] || [];
}

/**
 * @param {string} viewType
 * @returns {boolean}
 */
export function hasViewTypeRoleDefinitions(viewType) {
  return resolveViewTypeRoleDefinitions(viewType).length > 0;
}

/**
 * Studio view types that expose Role Mapping UI today.
 *
 * @param {string} viewType
 */
export function isStudioRoleMappingEnabled(viewType) {
  return false;
}
