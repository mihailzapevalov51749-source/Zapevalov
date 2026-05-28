import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import PortalPageView from "./portal/PortalPageView";
import LibraryPageView from "./modules/documentLibraries/components/LibraryPageView";
import LoginPage from "./pages/login/LoginPage";
import ProfilePage from "./profile/components/ProfilePage";

import OnlyOfficeTest from "./test/OnlyOfficeTest";
import AppSidebarRendererPreview from "./shared/shell/sidebar/dev/AppSidebarRendererPreview";
import AppHeaderRendererPreview from "./shared/shell/header/dev/AppHeaderRendererPreview";
import AppShellShadowRuntimePreview from "./shared/shell/shadow/dev/AppShellShadowRuntimePreview";
import AppShellShadowDesignerPreview from "./shared/shell/shadow/dev/AppShellShadowDesignerPreview";

import { getMe } from "./api/authApi";
import { saveLastRuntimePath } from "./shared/appMode/appModeStorage";

import DesignerAccessGate from "./modules/designer/pages/DesignerAccessGate";
import DesignerTenantLayout from "./modules/designer/pages/DesignerTenantLayout";
import ObjectTypesPage from "./modules/designer/pages/ObjectTypesPage";
import ObjectTypeWorkspacePage from "./modules/designer/pages/ObjectTypeWorkspacePage";
import DesignerSectionPlaceholderPage from "./modules/designer/pages/DesignerSectionPlaceholderPage";

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

function RuntimePathTracker() {
  const location = useLocation();

  useEffect(() => {
    saveLastRuntimePath(location.pathname);
  }, [location.pathname]);

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
    <>
      <RuntimePathTracker />
      <Routes>
      <Route path="/" element={<Navigate to="/portal/1/page/1" replace />} />

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

      {import.meta.env.DEV ? (
        <Route
          path="/dev/appshell-shadow-designer"
          element={<AppShellShadowDesignerPreview />}
        />
      ) : null}

      <Route path="/tasks" element={<PortalPageView />} />

      <Route path="/universal-table" element={<PortalPageView />} />

      <Route
        path="/portal/:portalId/page/:pageId"
        element={<PortalPageView />}
      />

      <Route
        path="/portal/:portalId/library/:libraryId"
        element={<LibraryPageView />}
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
          <Route
            path="pages"
            element={<DesignerSectionPlaceholderPage title="Страницы" />}
          />
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
            element={<DesignerSectionPlaceholderPage title="Рабочие пространства" />}
          />
          <Route
            path="publishing"
            element={<DesignerSectionPlaceholderPage title="Публикация" />}
          />
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
    </>
  );
}