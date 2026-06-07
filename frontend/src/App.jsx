import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import PortalPageView from "./portal/PortalPageView";
import PortalObjectRuntimePage from "./portal/PortalObjectRuntimePage";
import PortalLibraryRuntimePage from "./portal/PortalLibraryRuntimePage";
import PortalWorkspaceRuntimePage from "./portal/PortalWorkspaceRuntimePage";
import LoginPage from "./pages/login/LoginPage";
import ProfilePage from "./profile/components/ProfilePage";

import OnlyOfficeTest from "./test/OnlyOfficeTest";
import AppSidebarRendererPreview from "./shared/shell/sidebar/dev/AppSidebarRendererPreview";
import AppHeaderRendererPreview from "./shared/shell/header/dev/AppHeaderRendererPreview";
import AppShellShadowRuntimePreview from "./shared/shell/shadow/dev/AppShellShadowRuntimePreview";
import AppShellShadowDesignerPreview from "./shared/shell/shadow/dev/AppShellShadowDesignerPreview";

import { getMe } from "./api/authApi";
import {
  saveLastDesignerPath,
  saveLastRuntimePath,
} from "./shared/appMode/appModeStorage";
import PlatformZoneTracker from "./shared/platformAccent/PlatformZoneTracker";
import {
  startTodayActiveTimePolling,
  stopTodayActiveTimePolling,
} from "./shared/userActivity/todayActiveTimeStore";
import {
  recordNavigationActivity,
  startUserActivityTracking,
  stopUserActivityTracking,
} from "./shared/userActivity/userActivityTracker";

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
import PlatformDevelopmentPage from "./modules/platformDashboard/pages/PlatformDevelopmentPage";
import { YasiiAssistantProvider } from "./yasii/context/YasiiAssistantContext.jsx";
import YasiiWorkspacePage from "./yasii/pages/YasiiWorkspacePage.jsx";
import { YasiiFloatingButton } from "./yasii";

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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const data = await getMe();

      setUser(data);
      localStorage.setItem("currentUser", JSON.stringify(data));
    } catch {
      setUser(null);
      localStorage.removeItem("currentUser");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const id = window.setTimeout(() => {
      loadUser();
    }, 0);

    return () => {
      window.clearTimeout(id);
    };
  }, []);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={loadUser} />;
  }

  return (
    <YasiiAssistantProvider>
      <ModePathTracker />
      <PlatformZoneTracker />
      <UserActivityBootstrap />
      <YasiiFloatingButton />
      <Routes>
      <Route path="/" element={<Navigate to="/portal/1/page/1" replace />} />

      <Route path="/yasii" element={<YasiiWorkspacePage />} />

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

      <Route path="/tasks" element={<PortalPageView />} />

      <Route path="/universal-table" element={<PortalPageView />} />

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

      <Route path="/profile" element={<ProfilePage />} />

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
          <Route path="platform/*" element={<PlatformDevelopmentPage />} />
          <Route
            path="administration/*"
            element={
              <ProtectedSuperadminRoute user={user}>
                <PortalPageView />
              </ProtectedSuperadminRoute>
            }
          />
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

      <Route
        path="/designer/administration/*"
        element={
          isSuperadmin(user) ? (
            <Navigate to="/designer/tenant/1/administration" replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/admin/*"
        element={
          isSuperadmin(user) ? (
            <Navigate to="/designer/tenant/1/administration" replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </YasiiAssistantProvider>
  );
}