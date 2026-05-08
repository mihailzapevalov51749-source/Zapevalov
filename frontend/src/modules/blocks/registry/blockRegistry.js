import TextBlockView from "../../blockTypes/text/TextBlockView";
import ImageBlockView from "../../blockTypes/image/ImageBlockView";
import DocumentsBlockView from "../../blockTypes/documents/DocumentsBlockView";
import ButtonBlockView from "../../blockTypes/button/ButtonBlockView";
import CardsBlockView from "../../blockTypes/cards/CardsBlockView";

import { UniversalTableView } from "../../universalTable";

export const blockViewRegistry = {
  text: TextBlockView,
  image: ImageBlockView,
  document: DocumentsBlockView,
  documents: DocumentsBlockView,
  button: ButtonBlockView,
  cards: CardsBlockView,

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
    table: "Таблица",
    universal_table: "Универсальная таблица",
  };

  return titles[type] || "Блок";
}

export function getBlockViewComponent(type) {
  return blockViewRegistry[type] || null;
}