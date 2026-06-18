import { Navigate, Route, Routes, useLocation } from "react-router-dom";



import ControlPlaneDashboardPage from "../pages/ControlPlaneDashboardPage";

import CompaniesWorkspacePage from "../pages/CompaniesWorkspacePage";

import UsersRolesWorkspacePage from "../pages/UsersRolesWorkspacePage";

import PlatformProfileWorkspacePage from "../pages/PlatformProfileWorkspacePage";

import PlatformWorkspacePage from "../pages/PlatformWorkspacePage";
import TenantCompanyProfileStudioRedirect from "../pages/TenantCompanyProfileStudioRedirect";

import AdminSystemPage from "../../admin/system/AdminSystemPage";

import PlatformEventJournalPage from "../../platformDashboard/pages/PlatformEventJournalPage";

import PlatformReleaseReviewPage from "../../platformReleases/pages/PlatformReleaseReviewPage";

import ControlPlaneModuleAppliesPage from "../pages/ControlPlaneModuleAppliesPage";

import ControlPlaneModuleRollbacksPage from "../pages/ControlPlaneModuleRollbacksPage";

import ControlPlaneModulePublicationsPage from "../pages/ControlPlaneModulePublicationsPage";

import ControlPlaneAccessGate from "../components/ControlPlaneAccessGate";

import ControlPlanePlaceholderTab from "../components/ControlPlanePlaceholderTab";

import {

  buildControlPlaneCompaniesPath,

  buildControlPlanePlatformPath,

  buildControlPlanePlatformProfilePath,

  buildControlPlaneRoute,

  buildControlPlaneUsersRolesPath,

  mapLegacyClientsPathToCompaniesWorkspace,

} from "../config/controlPlanePaths";

import ControlPlaneShell from "../shell/ControlPlaneShell";

import { PlatformSettingsProvider } from "../platformProfile/PlatformSettingsProvider.jsx";



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
          <Route
            path="companies/clients/:portalId/profile"
            element={<TenantCompanyProfileStudioRedirect />}
          />
          <Route
            path="companies/clients/:portalId/profile/:tabSlug"
            element={<TenantCompanyProfileStudioRedirect />}
          />
          <Route path="companies/licenses" element={<CompaniesWorkspacePage />} />

          <Route
            path="companies/versions"
            element={<Navigate to={buildControlPlaneCompaniesPath("clients")} replace />}
          />

          <Route path="clients" element={<LegacyClientsRedirect />} />

          <Route path="clients/*" element={<LegacyClientsRedirect />} />

          <Route path="templates/versions" element={<ControlPlanePlaceholderTab />} />

          <Route path="templates/updates" element={<ControlPlanePlaceholderTab />} />

          <Route

            path="templates/publish"

            element={<Navigate to={buildControlPlaneRoute("releases")} replace />}

          />

          <Route path="releases" element={<PlatformReleaseReviewPage />} />

          <Route
            path="releases/versions"
            element={<Navigate to={buildControlPlaneCompaniesPath("clients")} replace />}
          />

          <Route
            path="platform/licenses"
            element={<Navigate to={buildControlPlaneCompaniesPath("licenses")} replace />}
          />

          <Route

            path="platform"

            element={<Navigate to={buildControlPlanePlatformPath("overview")} replace />}

          />

          <Route path="platform/overview" element={<PlatformWorkspacePage />} />

          <Route path="platform/environments" element={<PlatformWorkspacePage />} />

          <Route path="platform/environments/:portalId" element={<PlatformWorkspacePage />} />

          <Route path="platform/modules" element={<PlatformWorkspacePage />} />

          <Route path="platform/module-update-offers" element={<PlatformWorkspacePage />} />

          <Route path="platform/module-update-previews" element={<PlatformWorkspacePage />} />

          <Route path="platform/policies" element={<PlatformWorkspacePage />} />

          <Route path="platform/monitoring" element={<PlatformWorkspacePage />} />

          <Route

            path="platform/tenant-module-configurations"

            element={<PlatformWorkspacePage />}

          />

          <Route path="platform/module-configuration-diffs" element={<PlatformWorkspacePage />} />

          <Route path="platform/backup" element={<ControlPlanePlaceholderTab />} />

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

          <Route path="users-roles/global-users" element={<UsersRolesWorkspacePage />} />

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

          <Route

            path="modules"

            element={<Navigate to={buildControlPlanePlatformPath("modules")} replace />}

          />

          <Route

            path="module-update-offers"

            element={<Navigate to={buildControlPlanePlatformPath("module-update-offers")} replace />}

          />

          <Route

            path="module-update-previews"

            element={<Navigate to={buildControlPlanePlatformPath("module-update-previews")} replace />}

          />

          <Route

            path="tenant-module-configurations"

            element={(

              <Navigate

                to={buildControlPlanePlatformPath("tenant-module-configurations")}

                replace

              />

            )}

          />

          <Route

            path="module-configuration-diffs"

            element={<Navigate to={buildControlPlanePlatformPath("module-configuration-diffs")} replace />}

          />

          <Route path="module-applies" element={<ControlPlaneModuleAppliesPage />} />

          <Route path="module-rollbacks" element={<ControlPlaneModuleRollbacksPage />} />

          <Route path="module-publications" element={<ControlPlaneModulePublicationsPage />} />

          <Route path="settings" element={<AdminSystemPage variant="platform" />} />

          <Route path="integrations" element={<ControlPlanePlaceholderTab />} />

          <Route path="audit-log" element={<PlatformEventJournalPage />} />

        </Route>

      </Routes>

      </PlatformSettingsProvider>

    </ControlPlaneAccessGate>

  );

}

