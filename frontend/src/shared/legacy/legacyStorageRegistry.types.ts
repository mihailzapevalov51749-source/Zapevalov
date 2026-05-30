/** Registry entry describes a legacy data storage path — not a business entity. */
export type LegacyStorageKind = "data_storage";

export type LegacyStorageStatus = "legacy";

export type LegacyStorageReplacement = "runtimeEntity";

export type LegacyStorageId = "legacyUniversalTableStorage";

export type LegacyStorageDefinition = {
  id: LegacyStorageId;
  /** Human-readable label for docs and diagnostics (not a business entity name). */
  label: string;
  legacyKind: LegacyStorageKind;
  status: LegacyStorageStatus;
  allowNewSourceCreation: boolean;
  allowExistingRead: boolean;
  allowExistingWrite: boolean;
  replacement: LegacyStorageReplacement;
  /**
   * Legacy chain:
   * Portal Page → universal_table block → universal_tables → universal_table_rows
   */
  pathDescription: string;
  affectedStorage: readonly string[];
  affectedBlockTypes: readonly string[];
  affectedNavigationTypes: readonly string[];
  affectedEntityPrefixes: readonly string[];
  creationBlockedMessage: string;
};
