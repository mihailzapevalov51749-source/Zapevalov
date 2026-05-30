import { isLegacyStorageBlockType } from "../../shared/legacy";

/** Все типы (включая legacy) — для справки и миграций. */
export const PAGE_CANVAS_BLOCK_TYPES_ALL = [
  { type: "section", title: "Раздел" },
  { type: "text", title: "Текст" },
  { type: "image", title: "Изображение" },
  { type: "document", title: "Документ" },
  { type: "link", title: "Ссылка" },
  { type: "button", title: "Кнопка" },
  { type: "cards", title: "Карточки" },
  { type: "universal_table", title: "Таблица" },
];

/** Типы блоков для контекстного меню canvas (без legacy storage). */
export const PAGE_CANVAS_BLOCK_TYPES = PAGE_CANVAS_BLOCK_TYPES_ALL.filter(
  (item) => !isLegacyStorageBlockType(item.type),
);

export function getCreatablePageCanvasBlockTypes() {
  return PAGE_CANVAS_BLOCK_TYPES;
}

export const PAGE_CANVAS_INTERACTIVE_SELECTOR =
  "button, input, textarea, select, a, [contenteditable='true'], [data-inline-editor='true'], [data-text-block-content='true'], [data-document-block-content='true'], [data-button-block-content='true'], [data-link-block-content='true'], [data-section-resize-handle='true'], [data-block-resize-handle='true']";
