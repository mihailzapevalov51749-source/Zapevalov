import { useCallback, useEffect, useMemo, useState } from "react";

import { getAdminUsers } from "../../../api/authApi";

import { adminSections } from "../config/adminSections";
import AdminDashboardGrid from "../components/dashboard/AdminDashboardGrid";


function isActiveUser(user) {
  const value = String(user?.status || "").toLowerCase();

  if (user?.is_active === true) return true;
  if (user?.is_active === false) return false;

  if (["active", "активен", "enabled"].includes(value)) return true;
  if (["inactive", "неактивен", "disabled", "blocked"].includes(value)) {
    return false;
  }

  return true;
}

function getUserTitle(user) {
  return (
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    user?.email ||
    "Пользователь"
  );
}

function getUserSubtitle(user) {
  return user?.email || user?.role_name || user?.role || "Без email";
}

function getUserAvatarUrl(user) {
  return user?.avatar_url || user?.avatarUrl || null;
}

function getUserAvatarSettings(user) {
  return user?.avatar_settings || user?.avatarSettings || null;
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsUsersLoading(true);

      const data = await getAdminUsers();
      const nextUsers = Array.isArray(data) ? data : data?.items || [];

      setUsers(nextUsers);
    } catch (error) {
      console.error("ADMIN DASHBOARD USERS LOAD ERROR:", error);
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const handleUserUpdated = () => {
      loadUsers();
    };

    window.addEventListener("user:profile-updated", handleUserUpdated);
    window.addEventListener("admin:users-updated", handleUserUpdated);

    return () => {
      window.removeEventListener("user:profile-updated", handleUserUpdated);
      window.removeEventListener("admin:users-updated", handleUserUpdated);
    };
  }, [loadUsers]);

  const sections = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(isActiveUser).length;
    const inactiveUsers = Math.max(totalUsers - activeUsers, 0);

    const latestUsers = users.slice(0, 4).map((user) => ({
      id: user?.id || user?.email,
      title: getUserTitle(user),
      subtitle: getUserSubtitle(user),
      avatarUrl: getUserAvatarUrl(user),
      avatarSettings: getUserAvatarSettings(user),
      meta: isActiveUser(user) ? "Активен" : "Неактивен",
    }));

    return adminSections.map((section) => {
      if (section.id !== "users") return section;

      return {
        ...section,
        metrics: [
          {
            label: "Всего пользователей",
            value: isUsersLoading ? "…" : String(totalUsers),
            tone: "primary",
          },
          {
            label: "Активных",
            value: isUsersLoading ? "…" : String(activeUsers),
            tone: "success",
          },
          {
            label: "Неактивных",
            value: isUsersLoading ? "…" : String(inactiveUsers),
            tone: "muted",
          },
        ],
        previewTitle: "Последние пользователи",
        previewItems: isUsersLoading ? [] : latestUsers,
      };
    });
  }, [users, isUsersLoading]);

  const handleNavigate = (route) => {
    if (!route) return;

    window.history.pushState({}, "", route);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div style={pageStyle}>
      <AdminDashboardGrid sections={sections} onNavigate={handleNavigate} />
    </div>
  );
}

const pageStyle = {
  flex: 1,
  minHeight: 0,
  height: "100%",

  padding: "8px 12px 20px",

  display: "flex",
  flexDirection: "column",

  boxSizing: "border-box",

  background: "#F8FAFC",

  overflowY: "auto",
  overflowX: "hidden",
};