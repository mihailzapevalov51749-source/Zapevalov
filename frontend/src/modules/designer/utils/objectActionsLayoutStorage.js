export {
  DEFAULT_LEFT_WIDTH_RATIO as DEFAULT_LEFT_PANEL_RATIO,
  DEFAULT_MAX_LEFT_WIDTH_RATIO as MAX_LEFT_PANEL_RATIO,
  DEFAULT_MIN_LEFT_WIDTH_PX as MIN_LEFT_PANEL_WIDTH_PX,
  DEFAULT_MIN_RIGHT_WIDTH_PX as MIN_RIGHT_PANEL_WIDTH_PX,
  clampSplitLeftWidth as clampLeftPanelWidth,
  resolveDefaultSplitLeftWidth as resolveDefaultLeftPanelWidth,
} from "../../../shared/objectSettings/objectSettingsStorage.js";

import {
  buildObjectSettingsLayoutStorageKey,
  getObjectSettingsLayout,
  saveObjectSettingsLayout,
} from "../../../shared/objectSettings/objectSettingsStorage.js";

export function buildObjectActionsLayoutStorageKey(tenantId, objectTypeKey) {
  return buildObjectSettingsLayoutStorageKey({
    tenantId,
    objectTypeKey,
    tabKey: "actions",
  });
}

export function readStoredLeftPanelWidth(tenantId, objectTypeKey) {
  const storageKey = buildObjectActionsLayoutStorageKey(tenantId, objectTypeKey);
  const storedLayout = getObjectSettingsLayout(storageKey, 1000);
  const defaultLayout = getObjectSettingsLayout("__missing__", 1000);

  return storedLayout === defaultLayout ? null : storedLayout;
}

export function resolveInitialLeftPanelWidth(
  containerWidth,
  tenantId,
  objectTypeKey,
) {
  return getObjectSettingsLayout(
    buildObjectActionsLayoutStorageKey(tenantId, objectTypeKey),
    containerWidth,
  );
}

export function saveStoredLeftPanelWidth(tenantId, objectTypeKey, leftWidth) {
  saveObjectSettingsLayout(
    buildObjectActionsLayoutStorageKey(tenantId, objectTypeKey),
    leftWidth,
  );
}
