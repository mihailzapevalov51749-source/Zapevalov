export const ENTITY_CARD_TABS = {
  CHECKLIST: "checklist",
  SUBTASKS: "subtasks",
  NOTEBOOK: "notebook",
  RESULT: "result",
  ACTIVITY: "activity",
  RELATIONS: "relations",
  HISTORY: "history",
};

export const ENTITY_CARD_TAB_LIST = [
  {
    id: ENTITY_CARD_TABS.CHECKLIST,
    title: "Чек-лист",
  },
  {
    id: ENTITY_CARD_TABS.SUBTASKS,
    title: "Подзадачи",
  },
  {
    id: ENTITY_CARD_TABS.NOTEBOOK,
    title: "Блокнот",
  },
  {
    id: ENTITY_CARD_TABS.RESULT,
    title: "Результат",
  },
];

export const ENTITY_CARD_FIELD_TYPES = {
  TEXT: "text",
  TEXTAREA: "textarea",
  NUMBER: "number",
  DATE: "date",
  USER: "user",
  STATUS: "status",
  SELECT: "select",
  MULTISELECT: "multiselect",
  LOOKUP: "lookup",
  FILE: "file",
  CHECKBOX: "checkbox",
};

export const ENTITY_CARD_SIDEBAR_WIDTH = 360;

export const ENTITY_CARD_DEFAULT_ENTITY_TYPE =
  "task";

export const ENTITY_CARD_EMPTY_TEXT =
  "Не указано";

export const ENTITY_CARD_DEFAULT_STATUS = {
  label: "Новая",
  color: "#6366F1",
  background: "#EEF2FF",
};

export const ENTITY_CARD_UPLOAD_ACCEPT = [
  ".png",
  ".jpg",
  ".jpeg",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
];

export const ENTITY_CARD_MAX_ATTACHMENTS =
  50;

export const ENTITY_CARD_MAX_FILE_SIZE =
  1024 * 1024 * 100;

export const ENTITY_CARD_COMMENT_PLACEHOLDER =
  "Написать комментарий...";

export const ENTITY_CARD_NOTEBOOK_PLACEHOLDER =
  "Введите текст...";

export const ENTITY_CARD_RESULT_PLACEHOLDER =
  "Опишите результат выполнения...";

export const ENTITY_CARD_ANIMATION_DURATION =
  150;