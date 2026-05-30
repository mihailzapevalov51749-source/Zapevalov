import axios from "axios";

import { assertLegacyStorageBlockCreationAllowed } from "../shared/legacy";

const API = "http://127.0.0.1:8010";

export async function createBlock(sectionId, blockType, position = null) {
  assertLegacyStorageBlockCreationAllowed(blockType);

  const response = await axios.post(`${API}/blocks`, {
    section_id: sectionId,
    type: blockType,
    title: getDefaultTitle(blockType),
    content: getDefaultContent(blockType),
    settings: {
      show_title: true,
      position: position || getDefaultPosition(blockType),
    },
    order_index: 0,
  });

  return response.data;
}

function getDefaultPosition(blockType) {
  const sizes = getDefaultSize(blockType);

  return {
    x: 0,
    y: 0,
    ...sizes,
  };
}

function getDefaultSize(blockType) {
  const sizes = {
    text: {
      w: 12,
      h: 6,
    },
    image: {
      w: 16,
      h: 18,
    },
    document: {
      w: 12,
      h: 8,
    },
    link: {
      w: 10,
      h: 5,
    },
    button: {
      w: 8,
      h: 4,
    },
    cards: {
      w: 18,
      h: 12,
    },
    steps: {
      w: 18,
      h: 12,
    },
    universal_table: {
      w: 36,
      h: 18,
    },
    table: {
      w: 36,
      h: 18,
    },
  };

  return sizes[blockType] || {
    w: 12,
    h: 6,
  };
}

function getDefaultTitle(blockType) {
  const titles = {
    text: "Новый текстовый блок",
    image: "Новое изображение",
    document: "Новый документ",
    link: "Новая ссылка",
    button: "Новая кнопка",
    cards: "Новые карточки",
    steps: "Новые шаги",
    universal_table: "Таблица",
    table: "Таблица",
  };

  return titles[blockType] || "Новый блок";
}

function getDefaultContent(blockType) {
  if (blockType === "text") {
    return {
      text: "Введите текст блока",
    };
  }

  if (blockType === "link") {
    return {
      url: "",
      label: "Перейти",
    };
  }

  if (blockType === "button") {
    return {
      url: "",
      label: "Кнопка",
    };
  }

  return {};
}