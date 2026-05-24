import TextBlockView from "../../blockTypes/text/TextBlockView";
import ImageBlockView from "../../blockTypes/image/ImageBlockView";
import DocumentsBlockView from "../../blockTypes/documents/DocumentsBlockView";
import ButtonBlockView from "../../blockTypes/button/ButtonBlockView";
import LinkBlockView from "../../blockTypes/link/LinkBlockView";
import CardsBlockView from "../../blockTypes/cards/CardsBlockView";

import { UniversalTableView } from "../../universalTable";

import AdminDashboardBlock from "../../admin/blocks/AdminDashboardBlock";
import AdminSystemBlock from "../../admin/blocks/AdminSystemBlock";

export const blockViewRegistry = {
  text: TextBlockView,
  image: ImageBlockView,
  document: DocumentsBlockView,
  documents: DocumentsBlockView,
  button: ButtonBlockView,
  link: LinkBlockView,
  cards: CardsBlockView,

  admin_dashboard: AdminDashboardBlock,
  admin_system: AdminSystemBlock,

  // Старый тип table теперь тоже открываем через новую универсальную таблицу.
  // Это нужно, чтобы старые блоки не ломались после удаления старого модуля table.
  table: UniversalTableView,
  universal_table: UniversalTableView,
};

export function getBlockTypeTitle(type) {
  const titles = {
    text: "Текст",
    image: "Изображение",
    document: "Документ",
    documents: "Документы",
    link: "Ссылка",
    button: "Кнопка",
    cards: "Карточки",

    admin_dashboard: "Администрирование",
    admin_system: "Настройки системы",

    table: "Таблица",
    universal_table: "Универсальная таблица",
  };

  return titles[type] || "Блок";
}

export function getBlockViewComponent(type) {
  return blockViewRegistry[type] || null;
}