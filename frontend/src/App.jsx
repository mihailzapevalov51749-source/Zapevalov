import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import PortalPageView from "./portal/PortalPageView";
import LibraryPageView from "./modules/documentLibraries/components/LibraryPageView";
import LoginPage from "./pages/login/LoginPage";
import ProfilePage from "./profile/components/ProfilePage";

import OnlyOfficeTest from "./test/OnlyOfficeTest";

import { getMe } from "./api/authApi";

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
    loadUser();
  }, []);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={loadUser} />;
  }

  return (
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
  );
}