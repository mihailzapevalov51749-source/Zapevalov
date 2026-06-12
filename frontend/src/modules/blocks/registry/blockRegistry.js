import TextBlockView from "../../blockTypes/text/TextBlockView";
import ImageBlockView from "../../blockTypes/image/ImageBlockView";
import DocumentsBlockView from "../../blockTypes/documents/DocumentsBlockView";
import ButtonBlockView from "../../blockTypes/button/ButtonBlockView";
import LinkBlockView from "../../blockTypes/link/LinkBlockView";
import CardsBlockView from "../../blockTypes/cards/CardsBlockView";

import UnsupportedLegacyBlockView from "../components/UnsupportedLegacyBlockView";

import AdminDashboardBlock from "../../admin/blocks/AdminDashboardBlock";
import AdminSystemBlock from "../../admin/blocks/AdminSystemBlock";

import { isLegacyTableBlockType } from "./legacyTableBlockTypes";

const UNSUPPORTED_LEGACY_BLOCK = UnsupportedLegacyBlockView;

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

  table: UNSUPPORTED_LEGACY_BLOCK,
  universal_table: UNSUPPORTED_LEGACY_BLOCK,
  tableBlock: UNSUPPORTED_LEGACY_BLOCK,
  table_block: UNSUPPORTED_LEGACY_BLOCK,
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

    table: "Таблица (legacy)",
    universal_table: "Universal Table (legacy)",
    tableBlock: "Таблица (legacy)",
    table_block: "Таблица (legacy)",
  };

  return titles[type] || "Блок";
}

export function getBlockViewComponent(type) {
  if (isLegacyTableBlockType(type)) {
    return UNSUPPORTED_LEGACY_BLOCK;
  }

  return blockViewRegistry[type] || null;
}
