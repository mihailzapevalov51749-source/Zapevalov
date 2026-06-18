import { PROFILE_MODE_PLATFORM } from "./profileMode.js";
import PlatformProfileBridge from "./PlatformProfileBridge.jsx";
import TenantProfileProvider from "./TenantProfileProvider.jsx";

export default function ProfileProvider({ mode = PROFILE_MODE_PLATFORM, tenantId = null, children }) {
  if (mode === PROFILE_MODE_PLATFORM) {
    return <PlatformProfileBridge>{children}</PlatformProfileBridge>;
  }

  return <TenantProfileProvider tenantId={tenantId}>{children}</TenantProfileProvider>;
}
