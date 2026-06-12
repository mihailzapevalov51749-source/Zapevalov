import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAdminRoles, getAdminUsers } from "../../../api/authApi";
import { filterTenantSystemRoles } from "../../../shared/tenantRoles/tenantRoleModel.js";
import { getTenantRoles, getTenantUsers } from "../users/tenantUsersApi";
import {
  getTenantRegistrySummary,
  listTenantRegistry,
} from "../../controlPlane/api/tenantRegistryApi";

import { platformAdminSections } from "../config/platformAdminSections";
import { buildTenantAdminSections } from "../config/tenantAdminSections";
import AdminDashboardGrid from "../components/dashboard/AdminDashboardGrid";
import { resolveClientStatusLabel } from "../clients/clientStatusLabels";
import {
  buildInDevelopmentSectionEnrichment,
  buildRolesSectionEnrichment,
  buildUsersSectionEnrichment,
} from "./adminDashboardEnrichment";

const TENANT_IN_DEVELOPMENT_SECTION_IDS = new Set([
  "modules",
  "integrations",
  "audit-log",
]);

export default function AdminDashboardPage({ variant = "platform", tenantId = null }) {
  const navigate = useNavigate();
  const isTenantVariant = variant === "tenant";
  const resolvedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [clientsSummary, setClientsSummary] = useState(null);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsUsersLoading(true);

      const data = isTenantVariant
        ? await getTenantUsers(resolvedTenantId)
        : await getAdminUsers();
      const nextUsers = Array.isArray(data) ? data : data?.items || [];

      setUsers(nextUsers);
    } catch (error) {
      console.error("ADMIN DASHBOARD USERS LOAD ERROR:", error);
      setUsers([]);
    } finally {
      setIsUsersLoading(false);
    }
  }, [isTenantVariant, resolvedTenantId]);

  const loadRoles = useCallback(async () => {
    try {
      setIsRolesLoading(true);

      const data = isTenantVariant
        ? await getTenantRoles(resolvedTenantId)
        : await getAdminRoles();
      const loadedRoles = Array.isArray(data) ? data : [];
      setRoles(isTenantVariant ? filterTenantSystemRoles(loadedRoles) : loadedRoles);
    } catch (error) {
      console.error("ADMIN DASHBOARD ROLES LOAD ERROR:", error);
      setRoles([]);
    } finally {
      setIsRolesLoading(false);
    }
  }, [isTenantVariant, resolvedTenantId]);

  const loadClients = useCallback(async () => {
    try {
      setIsClientsLoading(true);

      const [registrySummary, companies] = await Promise.all([
        getTenantRegistrySummary(),
        listTenantRegistry(),
      ]);

      setClientsSummary(registrySummary);
      const sorted = [...(Array.isArray(companies) ? companies : [])].sort(
        (left, right) => Number(right.id) - Number(left.id),
      );
      setRecentCompanies(sorted.slice(0, 5));
    } catch (error) {
      console.error("ADMIN DASHBOARD CLIENTS LOAD ERROR:", error);
      setClientsSummary(null);
      setRecentCompanies([]);
    } finally {
      setIsClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    if (isTenantVariant) {
      loadRoles();
      return;
    }
    loadClients();
  }, [isTenantVariant, loadUsers, loadRoles, loadClients]);

  useEffect(() => {
    const handleUserUpdated = () => {
      loadUsers();
      if (isTenantVariant) {
        loadRoles();
      }
    };

    window.addEventListener("user:profile-updated", handleUserUpdated);
    window.addEventListener("admin:users-updated", handleUserUpdated);

    return () => {
      window.removeEventListener("user:profile-updated", handleUserUpdated);
      window.removeEventListener("admin:users-updated", handleUserUpdated);
    };
  }, [isTenantVariant, loadUsers, loadRoles]);

  const sections = useMemo(() => {
    const baseSections = isTenantVariant
      ? buildTenantAdminSections(resolvedTenantId)
      : platformAdminSections;

    const usersEnrichment = buildUsersSectionEnrichment(users, isUsersLoading);

    if (isTenantVariant) {
      const rolesEnrichment = buildRolesSectionEnrichment(
        roles,
        users,
        isRolesLoading || isUsersLoading,
      );

      return baseSections.map((section) => {
        if (section.id === "users") {
          return {
            ...section,
            ...usersEnrichment,
          };
        }

        if (section.id === "roles") {
          return {
            ...section,
            ...rolesEnrichment,
          };
        }

        if (section.id === "settings") {
          return {
            ...section,
            metrics: [],
          };
        }

        if (TENANT_IN_DEVELOPMENT_SECTION_IDS.has(section.id)) {
          return buildInDevelopmentSectionEnrichment(section);
        }

        return section;
      });
    }

    return baseSections.map((section) => {
      if (section.id === "clients") {
        const statusCounts = clientsSummary?.by_status || {};

        return {
          ...section,
          metrics: [
            {
              label: "Всего компаний",
              value: isClientsLoading ? "…" : String(clientsSummary?.total ?? 0),
              tone: "primary",
            },
            {
              label: "Активных",
              value: isClientsLoading ? "…" : String(statusCounts.ACTIVE ?? 0),
              tone: "success",
            },
            {
              label: "Отключённых",
              value: isClientsLoading ? "…" : String(statusCounts.DISABLED ?? 0),
              tone: "warning",
            },
            {
              label: "Архивных",
              value: isClientsLoading ? "…" : String(statusCounts.ARCHIVED ?? 0),
              tone: "muted",
            },
          ],
          previewItems: isClientsLoading
            ? []
            : recentCompanies.map((company) => ({
                id: company.id,
                title: company.name,
                tenantId: company.id,
                tenantType: company.tenant_type,
                meta: resolveClientStatusLabel(company.tenant_status),
              })),
        };
      }

      if (section.id !== "platform-users") return section;

      return {
        ...section,
        ...usersEnrichment,
      };
    });
  }, [
    isTenantVariant,
    resolvedTenantId,
    users,
    roles,
    isUsersLoading,
    isRolesLoading,
    clientsSummary,
    recentCompanies,
    isClientsLoading,
  ]);

  const handleNavigate = (route) => {
    if (!route) return;
    navigate(route);
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

