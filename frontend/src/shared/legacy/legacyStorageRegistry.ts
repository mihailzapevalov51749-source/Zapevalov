import type {
  LegacyStorageDefinition,
  LegacyStorageId,
} from "./legacyStorageRegistry.types";

export type { LegacyStorageDefinition, LegacyStorageId } from "./legacyStorageRegistry.types";

/**
 * Legacy Universal Table storage path (not a business entity, not Table View UI).
 *
 * Portal Page → universal_table block → universal_tables → universal_table_rows
 */
export const legacyUniversalTableStorage: LegacyStorageDefinition = {
  id: "legacyUniversalTableStorage",
  label: "Legacy Universal Table storage",
  legacyKind: "data_storage",
  status: "legacy",
  allowNewSourceCreation: false,
  allowExistingRead: true,
  allowExistingWrite: true,
  replacement: "runtimeEntity",
  pathDescription:
    "Portal Page → universal_table block → universal_tables → universal_table_rows",
  affectedStorage: ["universal_tables", "universal_table_rows", "universal_views"],
  affectedBlockTypes: ["universal_table", "table", "tableBlock", "table_block"],
  affectedNavigationTypes: ["universal_table"],
  affectedEntityPrefixes: ["universal_table", "universal_table_row"],
  creationBlockedMessage:
    "Создание новых универсальных таблиц (legacy storage) отключено. Используйте Object Type → Publish → Office.",
};

const LEGACY_STORAGE_REGISTRY: Record<LegacyStorageId, LegacyStorageDefinition> =
  {
    legacyUniversalTableStorage,
  };

const BLOCK_TYPE_TO_STORAGE_ID = new Map<string, LegacyStorageId>();

for (const entry of Object.values(LEGACY_STORAGE_REGISTRY)) {
  for (const blockType of entry.affectedBlockTypes) {
    BLOCK_TYPE_TO_STORAGE_ID.set(String(blockType).trim(), entry.id);
  }
}

function normalizeBlockType(blockType: unknown): string {
  return String(blockType ?? "").trim();
}

export function getLegacyStorage(id: LegacyStorageId): LegacyStorageDefinition {
  return LEGACY_STORAGE_REGISTRY[id];
}

export function getLegacyStorageForBlockType(
  blockType: unknown,
): LegacyStorageDefinition | null {
  const normalized = normalizeBlockType(blockType);
  if (!normalized) {
    return null;
  }

  const storageId = BLOCK_TYPE_TO_STORAGE_ID.get(normalized);
  if (!storageId) {
    return null;
  }

  return LEGACY_STORAGE_REGISTRY[storageId];
}

export function isLegacyStorageBlockType(blockType: unknown): boolean {
  return getLegacyStorageForBlockType(blockType) != null;
}

export function isLegacyUniversalTableStorageBlockType(
  blockType: unknown,
): boolean {
  const entry = getLegacyStorageForBlockType(blockType);
  return entry?.id === "legacyUniversalTableStorage";
}

export function canCreateLegacyStorage(id: LegacyStorageId): boolean {
  return LEGACY_STORAGE_REGISTRY[id]?.allowNewSourceCreation === true;
}

export function canReadExistingLegacyStorage(id: LegacyStorageId): boolean {
  return LEGACY_STORAGE_REGISTRY[id]?.allowExistingRead === true;
}

export function canWriteExistingLegacyStorage(id: LegacyStorageId): boolean {
  return LEGACY_STORAGE_REGISTRY[id]?.allowExistingWrite === true;
}

export function getLegacyStorageCreationBlockedMessage(
  id: LegacyStorageId,
): string {
  return (
    LEGACY_STORAGE_REGISTRY[id]?.creationBlockedMessage ??
    "Создание legacy storage отключено."
  );
}

export function canCreateLegacyStorageForBlockType(
  blockType: unknown,
): boolean {
  const entry = getLegacyStorageForBlockType(blockType);
  if (!entry) {
    return true;
  }
  return canCreateLegacyStorage(entry.id);
}

export function getLegacyStorageBlockedMessageForBlockType(
  blockType: unknown,
): string | null {
  if (canCreateLegacyStorageForBlockType(blockType)) {
    return null;
  }
  const entry = getLegacyStorageForBlockType(blockType);
  if (!entry) {
    return null;
  }
  return getLegacyStorageCreationBlockedMessage(entry.id);
}

export function assertLegacyStorageBlockCreationAllowed(
  blockType: unknown,
): void {
  const message = getLegacyStorageBlockedMessageForBlockType(blockType);
  if (message) {
    throw new Error(message);
  }
}

function normalizeNavigationType(navType: unknown): string {
  return String(navType ?? "").trim();
}

export function isLegacyStorageNavigationType(navType: unknown): boolean {
  const normalized = normalizeNavigationType(navType);
  if (!normalized) {
    return false;
  }

  return Object.values(LEGACY_STORAGE_REGISTRY).some((entry) =>
    entry.affectedNavigationTypes.includes(normalized),
  );
}

export function canCreateLegacyStorageForNavigationType(
  navType: unknown,
): boolean {
  const normalized = normalizeNavigationType(navType);
  if (!normalized) {
    return true;
  }

  for (const entry of Object.values(LEGACY_STORAGE_REGISTRY)) {
    if (!entry.affectedNavigationTypes.includes(normalized)) {
      continue;
    }
    return canCreateLegacyStorage(entry.id);
  }

  return true;
}

export function getLegacyStorageBlockedMessageForNavigationType(
  navType: unknown,
): string | null {
  const normalized = normalizeNavigationType(navType);
  if (!normalized) {
    return null;
  }

  for (const entry of Object.values(LEGACY_STORAGE_REGISTRY)) {
    if (!entry.affectedNavigationTypes.includes(normalized)) {
      continue;
    }
    if (!canCreateLegacyStorage(entry.id)) {
      return getLegacyStorageCreationBlockedMessage(entry.id);
    }
  }

  return null;
}
