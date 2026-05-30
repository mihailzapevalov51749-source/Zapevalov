export type {
  LegacyStorageDefinition,
  LegacyStorageId,
  LegacyStorageKind,
  LegacyStorageReplacement,
  LegacyStorageStatus,
} from "./legacyStorageRegistry.types";

export {
  assertLegacyStorageBlockCreationAllowed,
  canCreateLegacyStorage,
  canCreateLegacyStorageForBlockType,
  canCreateLegacyStorageForNavigationType,
  canReadExistingLegacyStorage,
  canWriteExistingLegacyStorage,
  getLegacyStorage,
  getLegacyStorageBlockedMessageForBlockType,
  getLegacyStorageBlockedMessageForNavigationType,
  getLegacyStorageCreationBlockedMessage,
  getLegacyStorageForBlockType,
  isLegacyStorageBlockType,
  isLegacyStorageNavigationType,
  isLegacyUniversalTableStorageBlockType,
  legacyUniversalTableStorage,
} from "./legacyStorageRegistry";

export {
  getLegacyStorageCreationNoticeMessage,
  LEGACY_STORAGE_CREATION_NOTICE_MESSAGE,
} from "./legacyStorageNoticeMessages";

export {
  getLegacyStorageExistingSupportMessage,
  getLegacyStorageExistingSupportShort,
  LEGACY_STORAGE_EXISTING_SUPPORT_MESSAGE,
  LEGACY_STORAGE_EXISTING_SUPPORT_SHORT,
  LEGACY_STORAGE_EXISTING_SUPPORT_TITLE,
} from "./legacyStorageExistingMessages";

export { default as LegacyStorageExistingBadge } from "./components/LegacyStorageExistingBadge";
export { default as LegacyStorageExistingSupportNotice } from "./components/LegacyStorageExistingSupportNotice";
export { default as LegacyStorageBlockPlaceholderView } from "./components/LegacyStorageBlockPlaceholderView";
export { default as LegacyStorageSystemRouteView } from "./components/LegacyStorageSystemRouteView";
export { default as LegacyStorageSupportModeBoundary } from "./support/LegacyStorageSupportModeBoundary";

export {
  clearLegacyStorageDirty,
  clearLegacyStorageSaveHandler,
  dispatchLegacyStorageTitleChanged,
  getLegacyStorageTitle,
  isLegacyStorageDirty,
  isLegacyStorageNavigationItem,
  LEGACY_STORAGE_LEAVE_CONFIRM_EVENT,
  LEGACY_STORAGE_TITLE_CHANGED_EVENT,
  markLegacyStorageDirty,
  readLegacyStorageSaveHandler,
  renameLegacyStorage,
  renameLegacyStorageForPage,
  requestLegacyLeaveConfirmation,
  resolveLegacyStorageTableIdForPage,
  saveLegacyStorage,
  setLegacyStorageTitle,
  subscribeToLegacyStorageTitle,
  syncLegacyStorageTitleAcrossUi,
  writeLegacyStorageSaveHandler,
} from "./adapters/legacyStorageAdapter";
