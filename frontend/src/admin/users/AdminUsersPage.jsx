import { useEffect, useMemo, useState } from "react";

import UsersHeader from "./UsersHeader";
import UsersList from "./UsersList";
import UserEditorCard from "./UserEditorCard";
import { styles } from "./usersStyles";

const API_BASE_URL = "http://127.0.0.1:8010";

const ROLE_OPTIONS_FALLBACK = [
  { id: 1, name: "user", description: "Просмотр доступных страниц." },
  { id: 2, name: "editor", description: "Просмотр и редактирование контента." },
  { id: 3, name: "admin", description: "Администрирование портала." },
  { id: 4, name: "superadmin", description: "Полный доступ к системе." },
];

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const emptyUser = {
  id: null,
  isNew: false,
  temp_password: "",
  full_name: "",
  email: "",
  phone: "",
  city: "",
  position: "",
  department: "",
  manager: "",
  mentor: "",
  avatar_url: "",
  avatar_settings: DEFAULT_AVATAR_SETTINGS,
  is_active: true,
  role_id: 1,
  role: "user",
};

function normalizeAvatarSettings(settings) {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

  if (typeof settings === "string") {
    try {
      return normalizeAvatarSettings(JSON.parse(settings));
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      x: Number(settings.x ?? settings.offsetX ?? 0),
      y: Number(settings.y ?? settings.offsetY ?? 0),
      scale: Number(settings.scale ?? settings.zoom ?? 1),
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
}

function normalizeUser(user = {}) {
  return {
    ...emptyUser,
    ...user,
    isNew: false,
    temp_password: user.temp_password || "",

    city: user.city || "",
    manager: user.manager || "",
    mentor: user.mentor || "",

    avatar_url: user.avatar_url || "",
    avatar_settings: normalizeAvatarSettings(
      user.avatar_settings ??
        user.avatarSettings ??
        user.avatar?.settings ??
        user.avatar?.avatar_settings
    ),

    role_id: user.role_id ?? user.roleId ?? user.role?.id ?? 1,
    role:
      user.role_name ||
      user.roleName ||
      (typeof user.role === "string" ? user.role : user.role?.name) ||
      "user",

    is_active:
      user.is_active === undefined || user.is_active === null
        ? true
        : Boolean(user.is_active),
  };
}

function normalizeExistingUser(user = {}) {
  return {
    ...normalizeUser(user),
    temp_password: "",
  };
}

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(ROLE_OPTIONS_FALLBACK);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) => {
      return [
        user.full_name,
        user.email,
        user.phone,
        user.city,
        user.position,
        user.department,
        user.manager,
        user.mentor,
        user.role,
        user.role_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [users, searchQuery]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [usersData, rolesData] = await Promise.allSettled([
        getUsers(),
        getRoles(),
      ]);

      if (usersData.status === "fulfilled") {
        const normalizedUsers = Array.isArray(usersData.value)
          ? usersData.value.map(normalizeExistingUser)
          : [];

        setUsers(normalizedUsers);

        if (selectedUser?.id) {
          const freshSelectedUser = normalizedUsers.find(
            (user) => String(user.id) === String(selectedUser.id)
          );

          if (freshSelectedUser) {
            setSelectedUser(freshSelectedUser);
            setForm(freshSelectedUser);
          }
        }
      } else {
        setError("Не удалось загрузить пользователей.");
      }

      if (rolesData.status === "fulfilled") {
        setRoles(
          Array.isArray(rolesData.value) && rolesData.value.length > 0
            ? rolesData.value
            : ROLE_OPTIONS_FALLBACK
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    const firstRole = roles[0] || ROLE_OPTIONS_FALLBACK[0];

    const newUser = {
      ...emptyUser,
      id: null,
      isNew: true,
      temp_password: "",
      is_active: true,
      role_id: firstRole?.id || 1,
      role: firstRole?.name || "user",
      avatar_settings: DEFAULT_AVATAR_SETTINGS,
    };

    setSelectedUser(newUser);
    setForm(newUser);
    setError("");
  };

  const handleSelectUser = (user) => {
    if (!user) {
      handleCloseEditor();
      return;
    }

    const normalizedUser = normalizeExistingUser(user);

    setSelectedUser(normalizedUser);
    setForm(normalizedUser);
    setError("");
  };

  const handleCloseEditor = () => {
    setSelectedUser(null);
    setForm(emptyUser);
    setError("");
    setDeleteModalOpen(false);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        position: form.position,
        department: form.department,
        manager: form.manager,
        mentor: form.mentor,
        is_active: form.is_active,
        role_id: form.role_id,
        avatar_url: form.avatar_url,
        avatar_settings: form.avatar_settings,
      };

      const savedUser = form.id
        ? await updateUser(form.id, payload)
        : await createUser(payload);

      const updated = form.id
        ? normalizeExistingUser(savedUser)
        : normalizeUser(savedUser);

      if (form.id) {
        setUsers((prev) =>
          prev.map((user) =>
            String(user.id) === String(form.id)
              ? normalizeExistingUser(updated)
              : user
          )
        );
      } else {
        setUsers((prev) => [normalizeExistingUser(updated), ...prev]);
      }

      setSelectedUser(updated);
      setForm(updated);
    } catch (e) {
      console.error(e);
      setError(
        form.id
          ? "Не удалось сохранить пользователя."
          : "Не удалось создать пользователя."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteModal = () => {
    if (!form?.id) return;
    setDeleteModalOpen(true);
  };

  const handleCancelDelete = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!form?.id) return;

    try {
      setDeleting(true);
      setError("");

      await deleteUser(form.id);

      setUsers((prev) =>
        prev.filter((user) => String(user.id) !== String(form.id))
      );

      handleCloseEditor();
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить пользователя.");
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const deletingUserName = form?.full_name || form?.email || "пользователя";

  return (
    <main style={styles.page}>
      <UsersHeader onRefresh={loadData} onCreate={handleCreateUser} />

      {error && <div style={styles.errorBox}>{error}</div>}

      <section style={styles.workspace}>
        <UsersList
          users={filteredUsers}
          loading={loading}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSelect={handleSelectUser}
          selectedUser={selectedUser}
          onClearSelection={handleCloseEditor}
        />

        <UserEditorCard
          user={form}
          roles={roles}
          saving={saving}
          deleting={deleting}
          onChange={handleChange}
          onSave={handleSave}
          onDelete={handleOpenDeleteModal}
          onClose={handleCloseEditor}
        />
      </section>

      {deleteModalOpen && (
        <div style={modalStyles.overlay} onMouseDown={handleCancelDelete}>
          <div
            style={modalStyles.modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={modalStyles.header}>
              <div>
                <div style={modalStyles.kicker}>Подтверждение действия</div>
                <div style={modalStyles.title}>Удалить пользователя?</div>
              </div>

              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={deleting}
                style={modalStyles.closeButton}
              >
                ×
              </button>
            </div>

            <div style={modalStyles.body}>
              Пользователь <b>{deletingUserName}</b> будет удалён из системы.
              Это действие нельзя отменить.
            </div>

            <div style={modalStyles.warning}>
              Перед удалением убедитесь, что этот пользователь больше не нужен
              для работы с порталом.
            </div>

            <div style={modalStyles.actions}>
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={deleting}
                style={{
                  ...modalStyles.cancelButton,
                  ...(deleting ? modalStyles.buttonDisabled : {}),
                }}
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  ...modalStyles.deleteButton,
                  ...(deleting ? modalStyles.buttonDisabled : {}),
                }}
              >
                {deleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    boxSizing: "border-box",
  },

  modal: {
    width: "100%",
    maxWidth: 440,
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
    padding: 18,
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  kicker: {
    fontSize: 12,
    fontWeight: 800,
    color: "#dc2626",
    marginBottom: 5,
  },

  title: {
    fontSize: 22,
    lineHeight: 1.15,
    fontWeight: 900,
    color: "#0f172a",
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 22,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    flexShrink: 0,
  },

  body: {
    fontSize: 14,
    lineHeight: 1.45,
    color: "#334155",
    marginBottom: 12,
  },

  warning: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 1.35,
    marginBottom: 16,
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },

  cancelButton: {
    height: 38,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  deleteButton: {
    height: 38,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #dc2626",
    background: "#dc2626",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
};