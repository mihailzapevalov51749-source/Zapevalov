import ControlPlanePlaceholderTab from "../components/ControlPlanePlaceholderTab.jsx";
import ControlPlaneModuleConfigurationDiffsPage from "../pages/ControlPlaneModuleConfigurationDiffsPage";
import ControlPlaneModuleUpdateOffersPage from "../pages/ControlPlaneModuleUpdateOffersPage";
import ControlPlaneModuleUpdatePreviewsPage from "../pages/ControlPlaneModuleUpdatePreviewsPage";
import ControlPlaneTenantModuleConfigurationsPage from "../pages/ControlPlaneTenantModuleConfigurationsPage";
import PlatformModulesPage from "../pages/PlatformModulesPage";
import PlatformEnvironmentsTab from "./environments/PlatformEnvironmentsTab.jsx";

const TAB_COMPONENTS = {
  overview: () => <ControlPlanePlaceholderTab>Обзор платформы</ControlPlanePlaceholderTab>,
  environments: PlatformEnvironmentsTab,
  modules: PlatformModulesPage,
  "module-update-offers": ControlPlaneModuleUpdateOffersPage,
  "module-update-previews": ControlPlaneModuleUpdatePreviewsPage,
  policies: () => <ControlPlanePlaceholderTab>Глобальные политики</ControlPlanePlaceholderTab>,
  monitoring: () => <ControlPlanePlaceholderTab>Мониторинг</ControlPlanePlaceholderTab>,
  "tenant-module-configurations": ControlPlaneTenantModuleConfigurationsPage,
  "module-configuration-diffs": ControlPlaneModuleConfigurationDiffsPage,
};

export default function PlatformWorkspaceTabPage({ tabSlug }) {
  const TabComponent = TAB_COMPONENTS[tabSlug];

  if (!TabComponent) {
    return null;
  }

  return <TabComponent />;
}
