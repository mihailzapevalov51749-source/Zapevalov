export const LEGACY_TABLE_BLOCK_TYPES = new Set([
  "universal_table",
  "table",
  "tableBlock",
  "table_block",
  "tables",
]);

export const LEGACY_TABLE_BLOCK_CREATION_MESSAGE =
  "Блоки Universal Table больше не поддерживаются. Используйте Object Types и Object Views.";

export const LEGACY_TABLE_NAVIGATION_BLOCKED_MESSAGE =
  "Пункты меню Universal Table больше не поддерживаются. Используйте Object Types.";

export function isLegacyTableBlockType(type) {
  return LEGACY_TABLE_BLOCK_TYPES.has(String(type || "").trim());
}

export function getLegacyTableNavigationBlockedMessage(type) {
  return String(type || "").trim() === "universal_table"
    ? LEGACY_TABLE_NAVIGATION_BLOCKED_MESSAGE
    : null;
}

export function assertLegacyTableBlockCreationAllowed(blockType) {
  if (isLegacyTableBlockType(blockType)) {
    throw new Error(LEGACY_TABLE_BLOCK_CREATION_MESSAGE);
  }
}
