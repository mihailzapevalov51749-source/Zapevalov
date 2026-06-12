import { useCallback, useEffect, useMemo, useState } from "react";

import { resolveLegacyPlatformPermissions } from "../platformRoles/platformRoleModel.js";
import { getPlatformRoleByKey } from "../platformRoles/platformRoleStorage.js";
import {
  PLATFORM_ROLE_FILTER_ALL,
  PLATFORM_STATUS_FILTER_ALL,
  resolveDefaultCompanyAccessMode,
  resolveDefaultPlatformPermissions,
} from "./platformUserConstants.js";
import { getPlatformProfileSettings } from "../api/platformProfileSettingsApi.js";
import {
  createEmptyPlatformUser,
  normalizePlatformUser,
  resolveLegacyRoleNameForPlatformKey,
  resolvePlatformOwner,
  resolveRoleIdForPlatformKey,
  matchesPlatformUserSearch,
} from "./platformUserUtils.js";

const API_BASE_URL = "http://127.0.0.1:8010";

const ROLE_OPTIONS_FALLBACK = [
  { id: 1, name: "user", description: "Просмотр доступных страниц." },
  { id: 2, name: "editor", description: "Просмотр и редактирование контента." },
  { id: 3, name: "admin", description: "Администрирование портала." },
  { id: 4, name: "superadmin", description: "Полный доступ к системе." },
];

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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Ошибка запроса");
  }

  return response.json();
}

async function getUsers() {
  return fetchJson(`${API_BASE_URL}/admin/users`);
}

async function getRoles() {
  return fetchJson(`${API_BASE_URL}/admin/roles`);
}

async function updateUser(userId, data) {
  return fetchJson(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

async function createUser(data) {
  return fetchJson(`${API_BASE_URL}/admin/users`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function deleteUser(userId) {
  return fetchJson(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export default function usePlatformUsersPage({ initialUserId = null } = {}) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(ROLE_OPTIONS_FALLBACK);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [form, setForm] = useState(() => createEmptyPlatformUser(ROLE_OPTIONS_FALLBACK));
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(PLATFORM_ROLE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState(PLATFORM_STATUS_FILTER_ALL);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [systemOwnerUserId, setSystemOwnerUserId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let ownerUserId = null;
      try {
        const settings = await getPlatformProfileSettings();
        ownerUserId = settings?.owner?.user_id ?? null;
      } catch {
        ownerUserId = null;
      }
      setSystemOwnerUserId(ownerUserId);

      const [usersData, rolesData] = await Promise.allSettled([getUsers(), getRoles()]);

      const resolvedRoles =
        rolesData.status === "fulfilled"
        && Array.isArray(rolesData.value)
        && rolesData.value.length > 0
          ? rolesData.value
          : ROLE_OPTIONS_FALLBACK;

      setRoles(resolvedRoles);

      if (usersData.status === "fulfilled") {
        const normalizedUsers = Array.isArray(usersData.value)
          ? usersData.value
              .map((user) =>
                normalizePlatformUser(user, resolvedRoles, {
                  systemOwnerUserId: ownerUserId,
                }),
              )
              .filter(Boolean)
          : [];

        setUsers(normalizedUsers);

        setSelectedUserId((previous) => {
          if (previous != null && normalizedUsers.some((user) => String(user.id) === String(previous))) {
            return previous;
          }
          return normalizedUsers[0]?.id ?? null;
        });
      } else {
        setError("Не удалось загрузить пользователей платформы.");
        setUsers([]);
        setSelectedUserId(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateUser = useCallback(() => {
    const draft = createEmptyPlatformUser(roles);
    setIsDraftOpen(true);
    setSelectedUserId(null);
    setForm(draft);
    setError("");
  }, [roles]);

  const handleSelectUser = useCallback((user) => {
    if (!user) {
      setIsDraftOpen(false);
      setSelectedUserId(null);
      setForm(createEmptyPlatformUser(roles));
      setError("");
      return;
    }
    setIsDraftOpen(false);
    setSelectedUserId(user.id);
    setError("");
  }, [roles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialUserId == null || loading) {
      return;
    }

    const matchedUser = users.find(
      (user) => String(user.id) === String(initialUserId),
    );
    if (matchedUser) {
      handleSelectUser(matchedUser);
    }
  }, [initialUserId, users, loading, handleSelectUser]);

  useEffect(() => {
    const handleOwnerUpdated = (event) => {
      setSystemOwnerUserId(event?.detail?.owner?.userId ?? null);
      loadData();
    };

    window.addEventListener("platform-owner:updated", handleOwnerUpdated);
    return () => {
      window.removeEventListener("platform-owner:updated", handleOwnerUpdated);
    };
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (!matchesPlatformUserSearch(user, searchQuery)) {
        return false;
      }
      if (roleFilter !== PLATFORM_ROLE_FILTER_ALL && user.platformRoleKey !== roleFilter) {
        return false;
      }
      if (statusFilter === "active" && !user.is_active) {
        return false;
      }
      if (statusFilter === "inactive" && user.is_active) {
        return false;
      }
      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const platformOwner = useMemo(() => resolvePlatformOwner(users), [users]);

  const selectedUser = useMemo(
    () => users.find((user) => String(user.id) === String(selectedUserId)) ?? null,
    [users, selectedUserId],
  );

  useEffect(() => {
    if (selectedUser) {
      setIsDraftOpen(false);
      setForm({ ...selectedUser, password: "", password_repeat: "" });
      return;
    }
    if (!isDraftOpen) {
      setForm(createEmptyPlatformUser(roles));
    }
  }, [selectedUser, roles, isDraftOpen]);

  useEffect(() => {
    if (
      selectedUserId != null
      && !filteredUsers.some((user) => String(user.id) === String(selectedUserId))
    ) {
      setSelectedUserId(filteredUsers[0]?.id ?? null);
    }
  }, [filteredUsers, selectedUserId]);

  const handleChange = useCallback((field, value) => {
    setForm((previous) => {
      const next = { ...previous, [field]: value };

      if (field === "platformRoleKey" && value === "platform_owner" && !previous.isSystemPlatformOwner) {
        return previous;
      }

      if (field === "platformRoleKey") {
        next.role_id = resolveRoleIdForPlatformKey(value, roles);
        next.role = resolveLegacyRoleNameForPlatformKey(value, roles);
        const roleDefinition = getPlatformRoleByKey(value);
        next.platformPermissions = roleDefinition
          ? resolveLegacyPlatformPermissions(roleDefinition)
          : resolveDefaultPlatformPermissions(value);
        next.companyAccessMode = resolveDefaultCompanyAccessMode(value);
      }

      if (field === "is_active") {
        next.is_active = Boolean(value);
      }

      return next;
    });
  }, [roles]);

  const validatePasswordFields = useCallback(() => {
    const password = String(form.password || "");
    const passwordRepeat = String(form.password_repeat || "");

    if (!password && !passwordRepeat) {
      return true;
    }

    if (!password || !passwordRepeat) {
      setError("Заполните оба поля пароля.");
      return false;
    }

    if (password !== passwordRepeat) {
      setError("Пароли не совпадают.");
      return false;
    }

    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов.");
      return false;
    }

    return true;
  }, [form.password, form.password_repeat]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError("");

      if (!validatePasswordFields()) {
        return;
      }

      if (form.platformRoleKey === "platform_owner" && !form.isSystemPlatformOwner) {
        setError("Владелец платформы назначается только в профиле платформы.");
        return;
      }

      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        is_active: form.is_active,
        role_id: form.role_id,
        avatar_url: form.avatar_url,
        avatar_settings: form.avatar_settings,
      };

      if (form.password) {
        payload.password = form.password;
      }

      const savedUser = form.id
        ? await updateUser(form.id, payload)
        : await createUser(payload);

      const updated = normalizePlatformUser(savedUser, roles, { systemOwnerUserId });
      const merged = {
        ...updated,
        platformPermissions: form.platformPermissions,
        companyAccessMode: form.companyAccessMode,
        companyAccessIds: form.companyAccessIds,
        password: "",
        password_repeat: "",
      };

      if (form.id) {
        setUsers((previous) =>
          previous.map((user) => (String(user.id) === String(form.id) ? merged : user)),
        );
        setSelectedUserId(merged.id);
      } else {
        setUsers((previous) => [merged, ...previous]);
        setSelectedUserId(merged.id);
      }

      setForm(merged);
      window.dispatchEvent(new CustomEvent("admin:users-updated"));
      window.dispatchEvent(new CustomEvent("user:profile-updated"));
    } catch (requestError) {
      console.error(requestError);
      setError(
        form.id
          ? "Не удалось сохранить пользователя платформы."
          : "Не удалось создать пользователя платформы.",
      );
    } finally {
      setSaving(false);
    }
  }, [form, roles, validatePasswordFields]);

  const handleConfirmDelete = useCallback(async () => {
    if (!form?.id) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      await deleteUser(form.id);
      setUsers((previous) => previous.filter((user) => String(user.id) !== String(form.id)));
      setSelectedUserId(null);
      setForm(createEmptyPlatformUser(roles));
      window.dispatchEvent(new CustomEvent("admin:users-updated"));
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось удалить доступ пользователя.");
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  }, [form?.id, roles]);

  return {
    users,
    filteredUsers,
    roles,
    platformOwner,
    selectedUserId,
    selectedUser,
    form,
    searchQuery,
    roleFilter,
    statusFilter,
    loading,
    saving,
    deleting,
    error,
    deleteModalOpen,
    isDraftOpen,
    setSearchQuery,
    setRoleFilter,
    setStatusFilter,
    setDeleteModalOpen,
    loadData,
    handleCreateUser,
    handleSelectUser,
    handleChange,
    handleSave,
    handleConfirmDelete,
  };
}
