import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import PortalPageView from "./portal/PortalPageView";
import PortalObjectRuntimePage from "./portal/PortalObjectRuntimePage";
import PortalLibraryRuntimePage from "./portal/PortalLibraryRuntimePage";
import PortalWorkspaceRuntimePage from "./portal/PortalWorkspaceRuntimePage";
import LoginPage from "./pages/login/LoginPage";
import LoginEntryRedirect from "./pages/login/LoginEntryRedirect";
import OnlyOfficeTest from "./test/OnlyOfficeTest";
import AppSidebarRendererPreview from "./shared/shell/sidebar/dev/AppSidebarRendererPreview";
import AppHeaderRendererPreview from "./shared/shell/header/dev/AppHeaderRendererPreview";
import AppShellShadowRuntimePreview from "./shared/shell/shadow/dev/AppShellShadowRuntimePreview";
import AppShellShadowDesignerPreview from "./shared/shell/shadow/dev/AppShellShadowDesignerPreview";

import { resolveAuthSession } from "./api/sessionBridgeApi";
import { attachPlatformApiClientActivityInterceptor } from "./api/platformApiClientActivity.js";
import { platformApiClient } from "./modules/designer/api/platformApiClient";
import RootEntryRedirect from "./shared/appMode/RootEntryRedirect";
import {
  saveLastDesignerPath,
  saveLastRuntimePath,
} from "./shared/appMode/appModeStorage";
import PlatformZoneTracker from "./shared/platformAccent/PlatformZoneTracker";
import TenantEnvironmentTracker from "./shared/tenantEnvironment/TenantEnvironmentTracker";
import {
  startTodayActiveTimePolling,
  stopTodayActiveTimePolling,
} from "./shared/userActivity/todayActiveTimeStore";
import {
  recordNavigationActivity,
  startUserActivityTracking,
  stopUserActivityTracking,
} from "./shared/userActivity/userActivityTracker";

import OfficeRuntimeTenantGuard from "./shared/officeRuntime/OfficeRuntimeTenantGuard.jsx";
import YasiiTenantGuard from "./shared/yasiiRuntime/YasiiTenantGuard.jsx";
import DesignerAccessGate from "./modules/designer/pages/DesignerAccessGate";
import DesignerTenantLayout from "./modules/designer/pages/DesignerTenantLayout";
import ObjectTypesPage from "./modules/designer/pages/ObjectTypesPage";
import ObjectTypeWorkspacePage from "./modules/designer/pages/ObjectTypeWorkspacePage";
import ObjectTypeDataPage from "./modules/designer/pages/ObjectTypeDataPage";
import DesignerSectionPlaceholderPage from "./modules/designer/pages/DesignerSectionPlaceholderPage";
import DesignerPagesPage from "./modules/designer/pages/DesignerPagesPage";
import DesignerTrashPage from "./modules/designer/pages/DesignerTrashPage";
import DesignerWorkspacesPage from "./modules/designer/pages/DesignerWorkspacesPage";
import DesignerWorkspaceDetailPage from "./modules/designer/pages/DesignerWorkspaceDetailPage";
import PlatformEventJournalPage from "./modules/platformDashboard/pages/PlatformEventJournalPage";
import PlatformReleasesPage from "./modules/platformReleases/pages/PlatformReleasesPage";
import PlatformArchitecturePage from "./modules/platformArchitecture/pages/PlatformArchitecturePage";
import PlatformStudioSectionGuard, {
  PlatformStudioLegacyRedirect,
} from "./modules/platformDashboard/pages/PlatformStudioSectionGuard";
import AppShell from "./shared/appShell/AppShell.jsx";
import { ProfileSidePanelProvider } from "./profile/ProfileSidePanelProvider.jsx";
import { GlobalWorkspaceTabsProvider } from "./shared/workspaceTabs/GlobalWorkspaceTabsProvider.jsx";
import { YasiiAssistantProvider } from "./yasii/context/YasiiAssistantContext.jsx";
import YasiiWorkspacePage from "./yasii/pages/YasiiWorkspacePage.jsx";
import { YasiiFloatingButton } from "./yasii";
import ControlPlaneLayout from "./modules/controlPlane/layout/ControlPlaneLayout.jsx";
import LegacyControlPlaneRedirect from "./modules/controlPlane/layout/LegacyControlPlaneRedirect.jsx";
import TenantAdministrationRouter from "./modules/admin/routes/TenantAdministrationRouter.jsx";
import TenantModulesAccessGate from "./modules/admin/components/TenantModulesAccessGate.jsx";
import AdminModulesPage from "./modules/admin/modules/AdminModulesPage.jsx";
import PlatformSetupGate from "./modules/platformSetup/PlatformSetupGate.jsx";
import { PlatformConfirmProvider } from "./shared/platformModal";
import { ChatUnreadProvider } from "./modules/chats/context/ChatUnreadProvider.jsx";
import UnauthenticatedApp, {
  AuthenticatedCompanyKeyRoute,
} from "./shared/tenantContext/CompanyKeyRoutes.jsx";
import SessionBridgeEntryPage from "./pages/sessionBridge/SessionBridgeEntryPage";

function isSuperadmin(user) {
  if (!user) return false;

  const roleName = String(
    user.role || user.role_name || user.roleName || ""
  ).trim().toLowerCase();
  const roleId = Number(user.role_id ?? user.roleId);

  return roleName === "superadmin" || roleId === 4;
}

function ProtectedSuperadminRoute({ user, children }) {
  if (!isSuperadmin(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ModePathTracker() {
  const location = useLocation();

  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    saveLastRuntimePath(fullPath);
    saveLastDesignerPath(fullPath);
    recordNavigationActivity();
  }, [location.pathname, location.search, location.hash]);

  return null;
}

function UserActivityBootstrap() {
  useEffect(() => {
    attachPlatformApiClientActivityInterceptor(platformApiClient);
    startUserActivityTracking();
    startTodayActiveTimePolling();

    return () => {
      stopUserActivityTracking();
      stopTodayActiveTimePolling();
    };
  }, []);

  return null;
}

export default function App() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isBridgeEntryRoute = location.pathname.startsWith("/auth/session-bridge-entry");

  const loadUser = async () => {
    try {
      const { user: resolvedUser } = await resolveAuthSession();
      setUser(resolvedUser);
    } catch {
      setUser(null);
      localStorage.removeItem("currentUser");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isBridgeEntryRoute) {
      setLoading(false);
      return undefined;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    const id = window.setTimeout(() => {
      loadUser();
    }, 0);

    return () => {
      window.clearTimeout(id);
    };
  }, [isBridgeEntryRoute]);

  if (isBridgeEntryRoute) {
    return <SessionBridgeEntryPage />;
  }

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!user) {
    return <UnauthenticatedApp onLogin={loadUser} />;
  }

  return (
    <PlatformSetupGate user={user} onUserRefresh={loadUser}>
    <YasiiAssistantProvider>
      <GlobalWorkspaceTabsProvider>
        <ProfileSidePanelProvider>
        <PlatformConfirmProvider>
        <ChatUnreadProvider>
        <AppShell>
          <ModePathTracker />
          <PlatformZoneTracker />
          <TenantEnvironmentTracker />
          <UserActivityBootstrap />
          <YasiiFloatingButton />
          <Routes>
      <Route path="/" element={<RootEntryRedirect user={user} />} />
      <Route path="/login" element={<LoginEntryRedirect user={user} />} />

      <Route path="/yasii" element={<YasiiTenantGuard user={user} />}>
        <Route index element={<YasiiWorkspacePage />} />
      </Route>

      <Route path="/control-plane/*" element={<ControlPlaneLayout />} />

      <Route path="/onlyoffice-test" element={<OnlyOfficeTest />} />

      {import.meta.env.DEV ? (
        <Route
          path="/dev/app-sidebar-renderer"
          element={<AppSidebarRendererPreview />}
        />
      ) : null}

      {import.meta.env.DEV ? (
        <Route
          path="/dev/app-header-renderer"
          element={<AppHeaderRendererPreview />}
        />
      ) : null}

      {import.meta.env.DEV ? (
        <Route
          path="/dev/appshell-shadow-runtime"
          element={<AppShellShadowRuntimePreview />}
        />
      ) : null}

      <Route element={<OfficeRuntimeTenantGuard user={user} />}>
        <Route path="/tasks" element={<PortalPageView />} />

        <Route
          path="/portal/:portalId/page/:pageId"
          element={<PortalPageView />}
        />

        <Route
          path="/portal/:portalId/object-types/:objectTypeRef/data"
          element={<PortalObjectRuntimePage />}
        />

        <Route
          path="/portal/:portalId/object-types/:objectTypeRef/:viewKey"
          element={<PortalObjectRuntimePage />}
        />

        <Route
          path="/portal/:portalId/object-types/:objectTypeRef"
          element={<PortalObjectRuntimePage />}
        />

        <Route
          path="/portal/:portalId/library/:libraryId"
          element={<PortalLibraryRuntimePage />}
        />

        <Route
          path="/portal/:portalId/workspaces/:workspaceSlug"
          element={<PortalWorkspaceRuntimePage />}
        />
        <Route
          path="/portal/:portalId/workspaces/:workspaceSlug/:tabSlug"
          element={<PortalWorkspaceRuntimePage />}
        />
        <Route
          path="/portal/:portalId/workspaces/:workspaceSlug/tabs/:tabSlug"
          element={<PortalWorkspaceRuntimePage />}
        />
      </Route>

      <Route path="/designer" element={<DesignerAccessGate user={user} />}>
        <Route path="tenant/:tenantId" element={<DesignerTenantLayout />}>
          <Route index element={<Navigate to="object-types" replace />} />
          <Route path="page/:pageId" element={<PortalPageView />} />
          <Route
            path="relations"
            element={<DesignerSectionPlaceholderPage title="Связи" />}
          />
          <Route
            path="views"
            element={<DesignerSectionPlaceholderPage title="Представления" />}
          />
          <Route path="pages" element={<DesignerPagesPage />} />
          <Route path="trash" element={<DesignerTrashPage />} />
          <Route
            path="navigation"
            element={<DesignerSectionPlaceholderPage title="Навигация" />}
          />
          <Route
            path="processes"
            element={<DesignerSectionPlaceholderPage title="Бизнес-процессы" />}
          />
          <Route
            path="workspaces"
            element={<DesignerWorkspacesPage />}
          />
          <Route
            path="workspaces/:workspaceSlug"
            element={<DesignerWorkspaceDetailPage />}
          />
          <Route
            path="publishing"
            element={<DesignerSectionPlaceholderPage title="Публикация" />}
          />
          <Route
            path="event-journal"
            element={
              <PlatformStudioSectionGuard>
                <PlatformEventJournalPage />
              </PlatformStudioSectionGuard>
            }
          />
          <Route
            path="platform-releases"
            element={
              <PlatformStudioSectionGuard>
                <PlatformReleasesPage />
              </PlatformStudioSectionGuard>
            }
          />
          <Route
            path="platform-architecture"
            element={
              <PlatformStudioSectionGuard>
                <PlatformArchitecturePage />
              </PlatformStudioSectionGuard>
            }
          />
          <Route path="platform/*" element={<PlatformStudioLegacyRedirect />} />
          <Route
            path="modules"
            element={
              <TenantModulesAccessGate>
                <AdminModulesPage />
              </TenantModulesAccessGate>
            }
          />
          <Route path="administration/*" element={<TenantAdministrationRouter />} />
          <Route path="object-types" element={<ObjectTypesPage />} />
          <Route
            path="object-types/:objectTypeId"
            element={<Navigate to="general" replace relative="path" />}
          />
          <Route
            path="object-types/:objectTypeId/data"
            element={<ObjectTypeDataPage />}
          />
          <Route
            path="object-types/:objectTypeId/:tab"
            element={<ObjectTypeWorkspacePage />}
          />
        </Route>
      </Route>

      <Route path="/designer/administration/*" element={<LegacyControlPlaneRedirect />} />

      <Route path="/admin/*" element={<LegacyControlPlaneRedirect />} />

      <Route
        path="/:companyKey"
        element={<AuthenticatedCompanyKeyRoute user={user} onLogin={loadUser} />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
        </ChatUnreadProvider>
        </PlatformConfirmProvider>
        </ProfileSidePanelProvider>
      </GlobalWorkspaceTabsProvider>
    </YasiiAssistantProvider>
    </PlatformSetupGate>
  );
}