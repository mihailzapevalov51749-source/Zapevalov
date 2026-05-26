import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import PortalPageView from "./portal/PortalPageView";
import LibraryPageView from "./modules/documentLibraries/components/LibraryPageView";
import LoginPage from "./pages/login/LoginPage";
import ProfilePage from "./profile/components/ProfilePage";

import OnlyOfficeTest from "./test/OnlyOfficeTest";

import { getMe } from "./api/authApi";
import { saveLastRuntimePath } from "./shared/appMode/appModeStorage";

import DesignerAccessGate from "./modules/designer/pages/DesignerAccessGate";
import DesignerTenantLayout from "./modules/designer/pages/DesignerTenantLayout";
import ObjectTypesPage from "./modules/designer/pages/ObjectTypesPage";
import ObjectTypeWorkspacePage from "./modules/designer/pages/ObjectTypeWorkspacePage";

const ADMIN_ROLES = ["admin", "superadmin"];
const ADMIN_ROLE_IDS = [3, 4];

function canOpenAdmin(user) {
  if (!user) return false;

  const roleName = user.role || user.role_name || user.roleName;
  const roleId = Number(user.role_id ?? user.roleId);

  return ADMIN_ROLES.includes(roleName) || ADMIN_ROLE_IDS.includes(roleId);
}

function ProtectedAdminRoute({ user, children }) {
  if (!canOpenAdmin(user)) {
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
  path="/admin"
  element={
    <ProtectedAdminRoute user={user}>
      <PortalPageView />
    </ProtectedAdminRoute>
  }
/>

      <Route
        path="/admin/users"
        element={
          <ProtectedAdminRoute user={user}>
            <PortalPageView />
          </ProtectedAdminRoute>
        }
      />

      <Route
        path="/admin/org-structure"
        element={
          <ProtectedAdminRoute user={user}>
            <PortalPageView />
          </ProtectedAdminRoute>
        }
      />

      <Route
        path="/admin/roles"
        element={
          <ProtectedAdminRoute user={user}>
            <PortalPageView />
          </ProtectedAdminRoute>
        }
      />

      <Route
        path="/admin/departments"
        element={
          <ProtectedAdminRoute user={user}>
            <PortalPageView />
          </ProtectedAdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}