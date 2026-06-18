import { settingsTabPageStyle } from "../admin/system/systemSettingsUi.jsx";

export default function ProfileSettingsTabPage({ children }) {
  return (
    <div className="profile-settings-tab-page" style={settingsTabPageStyle}>
      {children}
    </div>
  );
}
