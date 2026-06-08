import { useMemo } from "react";

import {
  buildObjectSettingsLayoutStorageKey,
  useObjectSettingsSplitResize,
} from "../../../shared/objectSettings";

export default function useObjectActionsSplitResize({
  tenantId,
  objectTypeKey,
} = {}) {
  const storageKey = useMemo(
    () =>
      buildObjectSettingsLayoutStorageKey({
        tenantId,
        objectTypeKey,
        tabKey: "actions",
      }),
    [objectTypeKey, tenantId],
  );

  return useObjectSettingsSplitResize({
    storageKey,
    minLeftWidth: 280,
    minRightWidth: 280,
  });
}
