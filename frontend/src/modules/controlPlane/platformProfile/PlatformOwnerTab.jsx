import { settingsTabPageStyle } from "../../admin/system/systemSettingsUi.jsx";
import PlatformOwnerForm from "./PlatformOwnerForm.jsx";

export default function PlatformOwnerTab() {
  return (
    <div style={settingsTabPageStyle}>
      <PlatformOwnerForm />
    </div>
  );
}
