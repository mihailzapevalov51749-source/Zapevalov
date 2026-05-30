import TextBlockView from "../../blockTypes/text/TextBlockView";
import ImageBlockView from "../../blockTypes/image/ImageBlockView";
import DocumentsBlockView from "../../blockTypes/documents/DocumentsBlockView";
import ButtonBlockView from "../../blockTypes/button/ButtonBlockView";
import LinkBlockView from "../../blockTypes/link/LinkBlockView";
import CardsBlockView from "../../blockTypes/cards/CardsBlockView";

import LegacyStorageBlockPlaceholderView from "../../../shared/legacy/components/LegacyStorageBlockPlaceholderView";

import AdminDashboardBlock from "../../admin/blocks/AdminDashboardBlock";
import AdminSystemBlock from "../../admin/blocks/AdminSystemBlock";

const LEGACY_STORAGE_BLOCK_PLACEHOLDER = LegacyStorageBlockPlaceholderView;

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

  table: LEGACY_STORAGE_BLOCK_PLACEHOLDER,
  universal_table: LEGACY_STORAGE_BLOCK_PLACEHOLDER,
  tableBlock: LEGACY_STORAGE_BLOCK_PLACEHOLDER,
  table_block: LEGACY_STORAGE_BLOCK_PLACEHOLDER,
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
    admin_system: "Настройка системы",

    table: "Таблица (legacy storage)",
    universal_table: "Универсальная таблица (legacy storage)",
  };

  return titles[type] || "Блок";
}

export function getBlockViewComponent(type) {
  return blockViewRegistry[type] || null;
}