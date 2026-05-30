import LegacyStorageSupportModeBoundary from "../support/LegacyStorageSupportModeBoundary";

const LEGACY_SYSTEM_ROUTE_BLOCK_ID = 999999;

/**
 * Thin adapter for the legacy /universal-table system route.
 * UniversalTableView is loaded only through LegacyStorageSupportModeBoundary.
 */
export default function LegacyStorageSystemRouteView({ isEditMode = false }) {
  return (
    <LegacyStorageSupportModeBoundary
      blockId={LEGACY_SYSTEM_ROUTE_BLOCK_ID}
      isEditMode={isEditMode}
    />
  );
}
