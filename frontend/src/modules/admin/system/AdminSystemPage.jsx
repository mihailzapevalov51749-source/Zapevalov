import { useLocation } from "react-router-dom";

import ProfileWorkspace from "../../profileWorkspace/ProfileWorkspace.jsx";
import { PROFILE_MODE_TENANT } from "../../profileWorkspace/profileMode.js";
import GeneralSettingsPanel from "./GeneralSettingsPanel.jsx";
import { SETTINGS_SCOPE_TENANT } from "./settingsLabels.js";
import { resolveStudioTenantIdFromPath } from "../config/tenantAdminPaths.js";
import {
  SYSTEM_SETTINGS_TABS,
  activeTabButtonStyle,
  pageStyle,
  tabButtonStyle,
  tabsStyle,
} from "./systemSettingsUi.jsx";

export default function AdminSystemPage({ variant = "tenant" }) {
  const location = useLocation();

  if (variant === "tenant") {
    const tenantId = resolveStudioTenantIdFromPath(location.pathname) ?? 1;

    return (
      <ProfileWorkspace
        mode={PROFILE_MODE_TENANT}
        portalId={tenantId}
        ariaLabel="Вкладки настроек компании"
      />
    );
  }

  return (
    <div style={pageStyle}>
      <div style={tabsStyle}>
        {SYSTEM_SETTINGS_TABS.map((tab, index) => (
          <button
            key={tab}
            type="button"
            style={{
              ...tabButtonStyle,
              ...(index === 0 ? activeTabButtonStyle : null),
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <GeneralSettingsPanel scope={SETTINGS_SCOPE_TENANT} />
    </div>
  );
}
