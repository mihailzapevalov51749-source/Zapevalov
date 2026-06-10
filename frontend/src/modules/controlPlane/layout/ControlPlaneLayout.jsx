import { Navigate, Route, Routes } from "react-router-dom";

import ControlPlaneDashboardPage from "../pages/ControlPlaneDashboardPage";
import ClientsOverviewPage from "../../admin/clients/ClientsOverviewPage";
import AdminTenantsPage from "../../admin/tenants/AdminTenantsPage";
import AdminUsersPage from "../../admin/users/AdminUsersPage";
import AdminRolesPage from "../../admin/roles/AdminRolesPage";
import AdminSystemPage from "../../admin/system/AdminSystemPage";
import ControlPlaneAccessGate from "../components/ControlPlaneAccessGate";
import ControlPlaneTenantRegistryPage from "../pages/ControlPlaneTenantRegistryPage";
import {
  ControlPlaneCompanyDetailRoute,
  ControlPlaneRegistryDetailRoute,
} from "../routes/ControlPlaneRoutePages";
import ControlPlaneShell from "../shell/ControlPlaneShell";
import SystemMessage from "../../../system/SystemMessage";

function ControlPlaneInDevelopmentPage() {
  return <SystemMessage>Раздел в разработке</SystemMessage>;
}

export default function ControlPlaneLayout() {
  return (
    <ControlPlaneAccessGate>
      <Routes>
        <Route element={<ControlPlaneShell />}>
          <Route index element={<ControlPlaneDashboardPage />} />
          <Route path="clients" element={<ClientsOverviewPage />} />
          <Route path="clients/companies" element={<AdminTenantsPage />} />
          <Route
            path="clients/companies/:portalId"
            element={<ControlPlaneCompanyDetailRoute />}
          />
          <Route path="clients/registry" element={<ControlPlaneTenantRegistryPage />} />
          <Route
            path="clients/registry/:tenantId"
            element={<ControlPlaneRegistryDetailRoute />}
          />
          <Route path="clients/create" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="clients/clone" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="templates/versions" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="templates/updates" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="templates/publish" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="platform/licenses" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="platform/policies" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="platform/monitoring" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="platform/backup" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="platform-users" element={<AdminUsersPage variant="platform" />} />
          <Route path="platform-roles" element={<AdminRolesPage variant="platform" />} />
          <Route path="users" element={<Navigate to="/control-plane/platform-users" replace />} />
          <Route path="roles" element={<Navigate to="/control-plane/platform-roles" replace />} />
          <Route path="modules" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="settings" element={<AdminSystemPage variant="platform" />} />
          <Route path="integrations" element={<ControlPlaneInDevelopmentPage />} />
          <Route path="audit-log" element={<ControlPlaneInDevelopmentPage />} />
        </Route>
      </Routes>
    </ControlPlaneAccessGate>
  );
}
