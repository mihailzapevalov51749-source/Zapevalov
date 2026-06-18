import {
  BackupTab,
  BrandingTab,
  GeneralSettingsTab,
  LimitsTab,
  NotificationsTab,
  SecurityTab,
  SystemBehaviorTab,
} from "../admin/system/tabs/settingsTabPanels.jsx";
import ProfileGeneralMainInfoForm from "./ProfileGeneralMainInfoForm.jsx";
import ProfileLicenseTab from "./ProfileLicenseTab.jsx";
import ProfileOwnerTab from "./ProfileOwnerTab.jsx";
import { useProfile } from "./ProfileContext.jsx";
import {
  PLATFORM_OWNER_TAB_SLUG,
  TENANT_LICENSE_TAB_SLUG,
  TENANT_OWNER_TAB_SLUG,
} from "./profileWorkspaceConfig.js";

const SHARED_TAB_COMPONENTS = {
  general: GeneralSettingsTab,
  branding: BrandingTab,
  notifications: NotificationsTab,
  limits: LimitsTab,
  backup: BackupTab,
  security: SecurityTab,
  behavior: SystemBehaviorTab,
  [TENANT_LICENSE_TAB_SLUG]: ProfileLicenseTab,
};

export default function ProfileTabPage({ tabSlug }) {
  const { scope, profileSettings } = useProfile();

  if (tabSlug === PLATFORM_OWNER_TAB_SLUG || tabSlug === TENANT_OWNER_TAB_SLUG) {
    return <ProfileOwnerTab />;
  }

  const TabComponent = SHARED_TAB_COMPONENTS[tabSlug];

  if (!TabComponent) {
    return null;
  }

  return (
    <TabComponent
      scope={scope}
      settings={profileSettings}
      {...(tabSlug === "general"
        ? { mainInfoSlot: <ProfileGeneralMainInfoForm /> }
        : {})}
    />
  );
}
