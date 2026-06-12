export const NAVIGATION_MENU_BLOCK_COUNT = 4;

export const NAVIGATION_MENU_BLOCK_GAP_PX = 14;

export const PINNED_HOME_MENU_ITEM_IDS = new Set([
  "cp-overview",
]);

const CONTROL_PLANE_DEFAULT_BLOCK_BY_ID = {
  "cp-overview": 1,
  "cp-group-companies": 2,
  "cp-group-templates": 2,
  "cp-group-platform": 2,
  "cp-group-platform-profile": 3,
  "cp-group-users-roles": 3,
  "cp-audit-log": 4,
};

export function normalizeNavigationBlockId(value, fallback = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const rounded = Math.trunc(parsed);
  if (rounded < 1 || rounded > NAVIGATION_MENU_BLOCK_COUNT) {
    return fallback;
  }
  return rounded;
}

export function isPinnedHomeNavigationItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const itemId = String(item.id || "").trim();
  if (PINNED_HOME_MENU_ITEM_IDS.has(itemId)) {
    return true;
  }

  const title = String(item.title || item.label || "").trim().toLowerCase();
  if (title === "главная" || title === "главная страница") {
    return true;
  }

  return item.is_home === true || item.isHome === true || item.type === "home";
}

export function isPinnedHomeNavigationItemId(itemId) {
  return PINNED_HOME_MENU_ITEM_IDS.has(String(itemId || "").trim());
}

export function resolveDefaultNavigationBlockId(item, index = 0, menuProfile = "platform") {
  if (isPinnedHomeNavigationItem(item)) {
    return 1;
  }

  const itemId = String(item?.id || "").trim();
  if (menuProfile === "control-plane" && CONTROL_PLANE_DEFAULT_BLOCK_BY_ID[itemId]) {
    return CONTROL_PLANE_DEFAULT_BLOCK_BY_ID[itemId];
  }

  if (index === 0) {
    return 2;
  }

  if (index < 4) {
    return 2;
  }

  if (index < 8) {
    return 3;
  }

  return 4;
}

export function resolveNavigationItemBlockId(item, settings = {}, options = {}) {
  const menuProfile = options.menuProfile || "platform";
  const itemId = String(item?.id || "").trim();
  const itemSettings = settings[itemId] || {};

  if (isPinnedHomeNavigationItem(item)) {
    return 1;
  }

  if (itemSettings.block_id != null) {
    return normalizeNavigationBlockId(itemSettings.block_id, 2);
  }

  if (item.block_id != null) {
    return normalizeNavigationBlockId(item.block_id, 2);
  }

  return resolveDefaultNavigationBlockId(item, options.index ?? 0, menuProfile);
}

export function createEmptyNavigationBlocks() {
  return Array.from({ length: NAVIGATION_MENU_BLOCK_COUNT }, () => []);
}

export function organizeRootNavigationIntoBlocks(
  rootItems = [],
  settings = {},
  options = {},
) {
  const blocks = createEmptyNavigationBlocks();
  const menuProfile = options.menuProfile || "platform";

  rootItems.forEach((item, index) => {
    const blockId = resolveNavigationItemBlockId(item, settings, {
      ...options,
      menuProfile,
      index,
    });
    const blockIndex = blockId - 1;
    const sortOrder =
      settings[item.id]?.sort_order ??
      item.sort_order ??
      index;

    blocks[blockIndex].push({
      ...item,
      block_id: blockId,
      sort_order: sortOrder,
    });
  });

  return blocks.map((blockItems) =>
    [...blockItems].sort((left, right) => {
      const leftOrder = Number(left?.sort_order ?? 0);
      const rightOrder = Number(right?.sort_order ?? 0);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return String(left?.id || "").localeCompare(String(right?.id || ""));
    }),
  );
}

export function flattenNavigationBlocks(blocks = []) {
  return blocks.flat();
}

export function enforcePinnedHomeInFirstBlock(blocks = []) {
  const nextBlocks = blocks.map((blockItems) => [...blockItems]);
  let pinnedItem = null;

  nextBlocks.forEach((blockItems, blockIndex) => {
    if (blockIndex === 0) {
      return;
    }

    const pinnedIndex = blockItems.findIndex((item) => isPinnedHomeNavigationItem(item));
    if (pinnedIndex === -1) {
      return;
    }

    pinnedItem = blockItems.splice(pinnedIndex, 1)[0];
  });

  if (pinnedItem) {
    const existsInFirst = nextBlocks[0].some(
      (item) => String(item.id) === String(pinnedItem.id),
    );
    if (!existsInFirst) {
      nextBlocks[0].unshift({
        ...pinnedItem,
        block_id: 1,
      });
    }
  }

  return nextBlocks.map((blockItems, blockIndex) =>
    blockItems.map((item) => ({
      ...item,
      block_id: isPinnedHomeNavigationItem(item) ? 1 : blockIndex + 1,
    })),
  );
}

export function buildNavigationBlockMovePayload(blocks = []) {
  const payload = [];

  blocks.forEach((blockItems, blockIndex) => {
    blockItems.forEach((item, sortOrder) => {
      payload.push({
        id: item.id,
        parent_id: null,
        block_id: isPinnedHomeNavigationItem(item) ? 1 : blockIndex + 1,
        sort_order: sortOrder,
      });

      if (Array.isArray(item.children) && item.children.length > 0) {
        item.children.forEach((child, childIndex) => {
          payload.push({
            id: child.id,
            parent_id: item.id,
            block_id: isPinnedHomeNavigationItem(item) ? 1 : blockIndex + 1,
            sort_order: childIndex,
          });
        });
      }
    });
  });

  return payload;
}

export function patchNavigationMenuSettings(currentSettings = {}, movePayload = []) {
  const next = { ...currentSettings };

  movePayload.forEach((item) => {
    const itemId = String(item?.id || "").trim();
    if (!itemId) {
      return;
    }

    next[itemId] = {
      ...(next[itemId] && typeof next[itemId] === "object" ? next[itemId] : {}),
      sort_order:
        typeof item.sort_order === "number" && Number.isFinite(item.sort_order)
          ? item.sort_order
          : undefined,
      parent_id: item.parent_id ?? null,
      block_id:
        item.block_id != null
          ? normalizeNavigationBlockId(item.block_id, 2)
          : undefined,
    };

    if (isPinnedHomeNavigationItemId(itemId)) {
      next[itemId].block_id = 1;
    }
  });

  return next;
}

export function applyNavigationBlocksToRootTree(tree = [], settings = {}, options = {}) {
  const blocks = organizeRootNavigationIntoBlocks(tree, settings, options);
  return flattenNavigationBlocks(blocks);
}

function cloneNavigationBlocks(blocks = []) {
  return blocks.map((blockItems) =>
    blockItems.map((item) => ({
      ...item,
      children: Array.isArray(item.children) ? [...item.children] : item.children,
    })),
  );
}

export function findNavigationItemBlockIndex(blocks, itemId) {
  const normalizedId = String(itemId || "");
  return blocks.findIndex((blockItems) =>
    blockItems.some((item) => String(item.id) === normalizedId),
  );
}

export function findNavigationItemInBlocks(blocks, itemId) {
  const blockIndex = findNavigationItemBlockIndex(blocks, itemId);
  if (blockIndex < 0) {
    return null;
  }

  return (
    blocks[blockIndex].find((item) => String(item.id) === String(itemId || "")) || null
  );
}

export function canMoveNavigationItemToBlock(item, targetBlockIndex) {
  if (!isPinnedHomeNavigationItem(item)) {
    return true;
  }

  return targetBlockIndex === 0;
}

function removeNavigationItemFromBlock(blockItems, itemId) {
  const normalizedId = String(itemId || "");
  const index = blockItems.findIndex((item) => String(item.id) === normalizedId);
  if (index === -1) {
    return { blockItems, removed: null };
  }

  const nextBlockItems = [...blockItems];
  const [removed] = nextBlockItems.splice(index, 1);
  return { blockItems: nextBlockItems, removed };
}

function insertNavigationItemIntoBlock(blockItems, item, { targetId, position }) {
  const nextBlockItems = [...blockItems];

  if (!targetId) {
    if (position === "start") {
      nextBlockItems.unshift(item);
    } else {
      nextBlockItems.push(item);
    }
    return nextBlockItems;
  }

  const targetIndex = nextBlockItems.findIndex(
    (entry) => String(entry.id) === String(targetId),
  );

  if (targetIndex === -1) {
    if (position === "start") {
      nextBlockItems.unshift(item);
    } else {
      nextBlockItems.push(item);
    }
    return nextBlockItems;
  }

  if (position === "before") {
    nextBlockItems.splice(targetIndex, 0, item);
    return nextBlockItems;
  }

  nextBlockItems.splice(targetIndex + 1, 0, item);
  return nextBlockItems;
}

export function moveItemInNavigationBlocks(blocks, draggedId, dropTarget) {
  const sourceBlockIndex = findNavigationItemBlockIndex(blocks, draggedId);
  if (sourceBlockIndex < 0 || !dropTarget) {
    return null;
  }

  const targetBlockIndex = Number(dropTarget.blockIndex);
  if (!Number.isFinite(targetBlockIndex) || targetBlockIndex < 0) {
    return null;
  }

  const nextBlocks = cloneNavigationBlocks(blocks);
  const { blockItems: sourceWithoutItem, removed } = removeNavigationItemFromBlock(
    nextBlocks[sourceBlockIndex],
    draggedId,
  );

  if (!removed) {
    return null;
  }

  if (!canMoveNavigationItemToBlock(removed, targetBlockIndex)) {
    return null;
  }

  nextBlocks[sourceBlockIndex] = sourceWithoutItem;
  nextBlocks[targetBlockIndex] = insertNavigationItemIntoBlock(
    nextBlocks[targetBlockIndex],
    removed,
    dropTarget,
  );

  return enforcePinnedHomeInFirstBlock(nextBlocks).map((blockItems, blockIndex) =>
    blockItems.map((item, sortOrder) => ({
      ...item,
      block_id: isPinnedHomeNavigationItem(item) ? 1 : blockIndex + 1,
      sort_order: sortOrder,
    })),
  );
}
