import GeneralSettingsPanel from "./GeneralSettingsPanel.jsx";
import { SETTINGS_SCOPE_TENANT } from "./settingsLabels.js";
import {
  SYSTEM_SETTINGS_TABS,
  activeTabButtonStyle,
  pageStyle,
  tabButtonStyle,
  tabsStyle,
} from "./systemSettingsUi.jsx";

export default function AdminSystemPage({ variant = "tenant" }) {
  void variant;

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
