import { useCallback, useEffect, useMemo, useState } from "react";

import {
  clonePlatformRole,
  countUsersForRole,
  matchesPlatformRoleSearch,
  PLATFORM_ROLE_STATUS_ACTIVE,
  normalizeRoleKey,
  sanitizeRoleKey,
  validateRoleKey,
} from "./platformRoleModel.js";
import {
  addCustomPlatformRole,
  loadPlatformRolesCatalog,
  subscribePlatformRolesCatalog,
  upsertPlatformRole,
} from "./platformRoleStorage.js";
import { normalizePlatformUser } from "../platformUsers/platformUserUtils.js";

import { API_BASE_URL } from "../../../config/apiConfig.js";

function getToken() {
  return localStorage.getItem("token");
}

function getHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchUsers() {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить пользователей");
  }

  return response.json();
}

export default function usePlatformRolesPage() {
  const [roles, setRoles] = useState(() => loadPlatformRolesCatalog());
  const [users, setUsers] = useState([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState(() => roles[0]?.key ?? null);
  const [form, setForm] = useState(() => clonePlatformRole(roles[0] || null));
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const reloadRoles = useCallback(() => {
    const catalog = loadPlatformRolesCatalog();
    setRoles(catalog);
    return catalog;
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const usersData = await fetchUsers();
      const normalized = Array.isArray(usersData)
        ? usersData.map((user) => normalizePlatformUser(user, []))
        : [];
      setUsers(normalized);
    } catch (requestError) {
      setUsers([]);
      setError(requestError.message || "Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => subscribePlatformRolesCatalog(setRoles), []);

  const rolesWithCounts = useMemo(
    () =>
      roles.map((role) => ({
        ...role,
        userCount: countUsersForRole(users, role.key),
      })),
    [roles, users],
  );

  const filteredRoles = useMemo(
    () => rolesWithCounts.filter((role) => matchesPlatformRoleSearch(role, searchQuery)),
    [rolesWithCounts, searchQuery],
  );

  const selectedRole = useMemo(
    () => rolesWithCounts.find((role) => role.key === selectedRoleKey) ?? null,
    [rolesWithCounts, selectedRoleKey],
  );

  useEffect(() => {
    if (selectedRole) {
      setForm(clonePlatformRole(selectedRole));
      return;
    }
    setForm(null);
  }, [selectedRole]);

  useEffect(() => {
    if (
      selectedRoleKey
      && !filteredRoles.some((role) => role.key === selectedRoleKey)
    ) {
      setSelectedRoleKey(filteredRoles[0]?.key ?? null);
    }
  }, [filteredRoles, selectedRoleKey]);

  useEffect(() => {
    if (!selectedRoleKey && filteredRoles[0]?.key) {
      setSelectedRoleKey(filteredRoles[0].key);
    }
  }, [filteredRoles, selectedRoleKey]);

  const handleRefresh = useCallback(async () => {
    reloadRoles();
    await loadUsers();
  }, [loadUsers, reloadRoles]);

  const handleSelectRole = useCallback((role) => {
    setSelectedRoleKey(role?.key ?? null);
    setError("");
  }, []);

  const handleChange = useCallback((field, value) => {
    setForm((previous) => {
      if (!previous) {
        return previous;
      }

      const next = { ...previous, [field]: value };

      if (field === "label" && !previous.isSystem) {
        const generatedKey = sanitizeRoleKey(value);
        if (generatedKey) {
          next.key = generatedKey;
        }
      }

      return next;
    });
  }, []);

  const toggleContour = useCallback((key) => {
    setForm((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        contours: {
          ...previous.contours,
          [key]: !previous.contours?.[key],
        },
      };
    });
  }, []);

  const toggleCpSection = useCallback((key) => {
    setForm((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        cpSections: {
          ...previous.cpSections,
          [key]: !previous.cpSections?.[key],
        },
      };
    });
  }, []);

  const toggleSectionPermission = useCallback((sectionKey, permissionKey) => {
    setForm((previous) => {
      if (!previous) {
        return previous;
      }
      const current = Boolean(previous.sectionPermissions?.[sectionKey]?.[permissionKey]);
      return {
        ...previous,
        sectionPermissions: {
          ...previous.sectionPermissions,
          [sectionKey]: {
            ...previous.sectionPermissions?.[sectionKey],
            [permissionKey]: !current,
          },
        },
      };
    });
  }, []);

  const toggleAdminCapability = useCallback((key) => {
    setForm((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        adminCapabilities: {
          ...previous.adminCapabilities,
          [key]: !previous.adminCapabilities?.[key],
        },
      };
    });
  }, []);

  const validateForm = useCallback(() => {
    if (!form?.label?.trim()) {
      setError("Укажите название роли.");
      return false;
    }
    if (!form?.key?.trim()) {
      setError("Укажите код роли.");
      return false;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(form.key)) {
      setError("Код роли должен содержать только латиницу, цифры и подчёркивание.");
      return false;
    }
    return true;
  }, [form]);

  const handleSave = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const saved = upsertPlatformRole({
        ...form,
        status: form.status || PLATFORM_ROLE_STATUS_ACTIVE,
      });
      reloadRoles();
      setSelectedRoleKey(saved.key);
    } catch (requestError) {
      setError(requestError.message || "Не удалось сохранить роль.");
    } finally {
      setSaving(false);
    }
  }, [form, reloadRoles, validateForm]);

  const handleCreateRole = useCallback(
    ({ label, key, description }) => {
      const trimmedLabel = String(label || "").trim();
      const roleKey = normalizeRoleKey(key);

      if (!trimmedLabel) {
        setError("Укажите название роли.");
        return false;
      }

      const keyError = validateRoleKey(roleKey, roles.map((role) => role.key));
      if (keyError) {
        setError(keyError);
        return false;
      }

      const created = addCustomPlatformRole({
        key: roleKey,
        label: trimmedLabel,
        description: description?.trim() || "",
      });

      reloadRoles();
      setSelectedRoleKey(created.key);
      setCreateModalOpen(false);
      setError("");
      return true;
    },
    [reloadRoles, roles],
  );

  return {
    roles: filteredRoles,
    allRoles: rolesWithCounts,
    selectedRoleKey,
    form,
    searchQuery,
    loading,
    saving,
    error,
    createModalOpen,
    setSearchQuery,
    setCreateModalOpen,
    handleRefresh,
    handleSelectRole,
    handleChange,
    toggleContour,
    toggleCpSection,
    toggleSectionPermission,
    toggleAdminCapability,
    handleSave,
    handleCreateRole,
  };
}
