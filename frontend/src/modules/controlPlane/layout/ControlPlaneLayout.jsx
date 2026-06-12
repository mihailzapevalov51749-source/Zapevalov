import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import ControlPlaneDashboardPage from "../pages/ControlPlaneDashboardPage";
import CompaniesWorkspacePage from "../pages/CompaniesWorkspacePage";
import UsersRolesWorkspacePage from "../pages/UsersRolesWorkspacePage";
import PlatformProfileWorkspacePage from "../pages/PlatformProfileWorkspacePage";
import AdminSystemPage from "../../admin/system/AdminSystemPage";
import PlatformEventJournalPage from "../../platformDashboard/pages/PlatformEventJournalPage";
import ControlPlaneAccessGate from "../components/ControlPlaneAccessGate";
import {
  buildControlPlaneCompaniesPath,
  buildControlPlanePlatformProfilePath,
  buildControlPlaneUsersRolesPath,
  mapLegacyClientsPathToCompaniesWorkspace,
} from "../config/controlPlanePaths";
import ControlPlaneShell from "../shell/ControlPlaneShell";
import { PlatformSettingsProvider } from "../platformProfile/PlatformSettingsProvider.jsx";
import SystemMessage from "../../../system/SystemMessage";

function ControlPlaneInDevelopmentPage() {
  return <SystemMessage>Раздел в разработке</SystemMessage>;
}

function LegacyClientsRedirect() {
  const location = useLocation();
  const target = mapLegacyClientsPathToCompaniesWorkspace(location.pathname);
  return <Navigate to={target || buildControlPlaneCompaniesPath("clients")} replace />;
}

export default function ControlPlaneLayout() {
  return (
    <ControlPlaneAccessGate>
      <PlatformSettingsProvider>
      <Routes>
        <Route element={<ControlPlaneShell />}>
          <Route index element={<ControlPlaneDashboardPage />} />
          <Route
            path="companies"
            element={<Navigate to={buildControlPlaneCompaniesPath("clients")} replace />}
          />
          <Route path="companies/clients" element={<CompaniesWorkspacePage />} />
          <Route path="companies/clients/:portalId" element={<CompaniesWorkspacePage />} />
          <Route path="clients" element={<LegacyClientsRedirect />} />
          <Route path="clients/*" element={<LegacyClientsRedirect />} />
          <Route path="templates/versions" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="templates/updates" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="templates/publish" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="platform/licenses" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="platform/policies" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="platform/monitoring" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="platform/backup" element={<ControlPlaneInDevelopmentPage />} />
          <Route
            path="platform-profile"
            element={<Navigate to={buildControlPlanePlatformProfilePath("general")} replace />}
          />
          <Route
            path="platform-profile/home"
            element={<Navigate to={buildControlPlanePlatformProfilePath("general")} replace />}
          />
          <Route path="platform-profile/general" element={<PlatformProfileWorkspacePage />} />
          <Route path="platform-profile/branding" element={<PlatformProfileWorkspacePage />} />
          <Route path="platform-profile/platform-owner" element={<PlatformProfileWorkspacePage />} />
          <Route path="platform-profile/localization" element={<PlatformProfileWorkspacePage />} />
          <Route path="platform-profile/notifications" element={<PlatformProfileWorkspacePage />} />
          <Route path="platform-profile/limits" element={<PlatformProfileWorkspacePage />} />
          <Route path="platform-profile/backup" element={<PlatformProfileWorkspacePage />} />
          <Route path="platform-profile/security" element={<PlatformProfileWorkspacePage />} />
          <Route path="platform-profile/behavior" element={<PlatformProfileWorkspacePage />} />
          <Route
            path="users-roles"
            element={<Navigate to={buildControlPlaneUsersRolesPath("users")} replace />}
          />
          <Route path="users-roles/users" element={<UsersRolesWorkspacePage />} />
          <Route path="users-roles/roles" element={<UsersRolesWorkspacePage />} />
          <Route
            path="platform-users"
            element={<Navigate to={buildControlPlaneUsersRolesPath("users")} replace />}
          />
          <Route
            path="platform-roles"
            element={<Navigate to={buildControlPlaneUsersRolesPath("roles")} replace />}
          />
          <Route
            path="users"
            element={<Navigate to={buildControlPlaneUsersRolesPath("users")} replace />}
          />
          <Route
            path="roles"
            element={<Navigate to={buildControlPlaneUsersRolesPath("roles")} replace />}
          />
          <Route path="modules" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="settings" element={<AdminSystemPage variant="platform" />} />
          <Route path="integrations" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="audit-log" element={<PlatformEventJournalPage />} />
        </Route>
      </Routes>
      </PlatformSettingsProvider>
    </ControlPlaneAccessGate>
  );
}
