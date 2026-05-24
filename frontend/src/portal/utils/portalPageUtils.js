const GRID_COLUMNS = 60;
const GRID_ROW_HEIGHT = 10;
const GRID_GAP = 2;

export function findNavigationItemById(items = [], itemId) {
  for (const item of items || []) {
    if (String(item.id) === String(itemId)) {
      return item;
    }

    const found = findNavigationItemById(item.children || [], itemId);

    if (found) {
      return found;
    }
  }

  return null;
}

export function findNavigationItemByPageId(items = [], pageId) {
  for (const item of items || []) {
    if (String(item.page_id) === String(pageId)) {
      return item;
    }

    const found = findNavigationItemByPageId(item.children || [], pageId);

    if (found) {
      return found;
    }
  }

  return null;
}

export function findNavigationItemsByPageId(items = [], pageId) {
  const result = [];

  const walk = (list = []) => {
    for (const item of list) {
      if (String(item.page_id) === String(pageId)) {
        result.push(item);
      }

      walk(item.children || []);
    }
  };

  walk(items);

  return result;
}

export function getSectionItemById(sections = [], sectionId) {
  return sections.find(
    (item) => String(item.section?.id) === String(sectionId)
  );
}

export function calculateDropPosition({
  sectionId,
  blockType,
  dropPoint,
  blocks = [],
}) {
  const defaultSize = getDefaultBlockSize(blockType);

  const sectionElement = document.querySelector(
    `[data-section-host-id="${sectionId}"]`
  );

  if (!sectionElement || !dropPoint?.clientX || !dropPoint?.clientY) {
    return {
      x: 0,
      y: getNextFreeY(blocks),
      ...defaultSize,
    };
  }

  const rect = sectionElement.getBoundingClientRect();

  const columnWidth = rect.width / GRID_COLUMNS;
  const relativeX = dropPoint.clientX - rect.left;
  const relativeY = dropPoint.clientY - rect.top;

  const x = clamp(
    Math.floor(relativeX / columnWidth),
    0,
    GRID_COLUMNS - defaultSize.w
  );

  const y = Math.max(0, Math.floor(relativeY / (GRID_ROW_HEIGHT + GRID_GAP)));

  return {
    x,
    y,
    ...defaultSize,
  };
}

function getDefaultBlockSize(blockType) {
  const sizes = {
    text: { w: 12, h: 6 },
    image: { w: 16, h: 18 },
    document: { w: 12, h: 8 },
    link: { w: 10, h: 5 },
    button: { w: 8, h: 4 },
    cards: { w: 18, h: 12 },
    steps: { w: 18, h: 12 },
    table: { w: 36, h: 18 },
    universal_table: { w: 36, h: 18 },
  };

  return sizes[blockType] || { w: 12, h: 6 };
}

function getNextFreeY(blocks = []) {
  if (!blocks.length) return 0;

  return Math.max(
    ...blocks.map((block) => {
      const position = block?.settings?.position || {};
      return Number(position.y || 0) + Number(position.h || 1);
    })
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}