import { useMemo } from "react";

import { usePlatformSettings } from "../controlPlane/platformProfile/PlatformSettingsProvider.jsx";
import { ProfileContext } from "./ProfileContext.jsx";
import { PROFILE_MODE_PLATFORM } from "./profileMode.js";
import { buildPlatformProfileContextValue } from "./tenantProfileMappers.js";

export default function PlatformProfileBridge({ children }) {
  const platformState = usePlatformSettings();
  const value = useMemo(
    () => ({
      ...buildPlatformProfileContextValue(platformState),
      mode: PROFILE_MODE_PLATFORM,
    }),
    [platformState],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
