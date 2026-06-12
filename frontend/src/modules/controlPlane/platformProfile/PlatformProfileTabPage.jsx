import { SETTINGS_SCOPE_PLATFORM } from "../../admin/system/settingsLabels.js";
import {
  BackupTab,
  BrandingTab,
  GeneralSettingsTab,
  LimitsTab,
  LocalizationTab,
  NotificationsTab,
  SecurityTab,
  SystemBehaviorTab,
} from "../../admin/system/tabs/settingsTabPanels.jsx";
import PlatformOwnerTab from "./PlatformOwnerTab.jsx";
import { usePlatformSettings } from "./PlatformSettingsProvider.jsx";

const TAB_COMPONENTS = {
  general: GeneralSettingsTab,
  branding: BrandingTab,
  "platform-owner": PlatformOwnerTab,
  localization: LocalizationTab,
  notifications: NotificationsTab,
  limits: LimitsTab,
  backup: BackupTab,
  security: SecurityTab,
  behavior: SystemBehaviorTab,
};

export default function PlatformProfileTabPage({ tabSlug }) {
  const { profileSettings } = usePlatformSettings();
  const TabComponent = TAB_COMPONENTS[tabSlug];

  if (!TabComponent) {
    return null;
  }

  return <TabComponent scope={SETTINGS_SCOPE_PLATFORM} settings={profileSettings} />;
}
