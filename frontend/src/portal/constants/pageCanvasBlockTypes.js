/** Типы блоков для контекстного меню canvas-редактора (совпадают с WidgetLibrary). */
export const PAGE_CANVAS_BLOCK_TYPES = [
  { type: "section", title: "Раздел" },
  { type: "text", title: "Текст" },
  { type: "image", title: "Изображение" },
  { type: "document", title: "Документ" },
  { type: "link", title: "Ссылка" },
  { type: "button", title: "Кнопка" },
  { type: "cards", title: "Карточки" },
  { type: "universal_table", title: "Таблица" },
  { type: "admin_dashboard", title: "Администрирование" },
  { type: "page_settings", title: "Настройки страницы" },
];

export const PAGE_CANVAS_INTERACTIVE_SELECTOR =
  "button, input, textarea, select, a, [contenteditable='true'], [data-inline-editor='true'], [data-text-block-content='true'], [data-document-block-content='true'], [data-button-block-content='true'], [data-link-block-content='true'], [data-section-resize-handle='true'], [data-block-resize-handle='true']";
