import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import {
  TENANT_ROLE_OPTIONS_FALLBACK,
  filterTenantSystemRoles,
  resolveTenantRoleDisplay,
} from "../../../shared/tenantRoles/tenantRoleModel.js";
import UsersHeader from "./UsersHeader";
import UsersList from "./UsersList";
import UserEditorCard from "./UserEditorCard";
import {
  createTenantUser,
  deleteTenantUser,
  getTenantRoles,
  getTenantUsers,
  lookupTenantUserEmail,
  restoreTenantUser,
  updateTenantUser,
} from "./tenantUsersApi";
import { styles } from "./usersStyles";

import { API_BASE_URL } from "../../../config/apiConfig.js";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const emptyUser = {
  id: null,
  isNew: false,

  temp_password: "",
  password: "",
  password_repeat: "",

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

  role_id: TENANT_ROLE_OPTIONS_FALLBACK[2].id,
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
    password: "",
    password_repeat: "",

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
    role: resolveTenantRoleDisplay(user) || "user",

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
    password: "",
    password_repeat: "",
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

function resolveRolesForVariant(variant, roles) {
  if (variant === "tenant") {
    return filterTenantSystemRoles(roles);
  }

  return Array.isArray(roles) ? roles : [];
}

export default function AdminUsersPage({ variant = "tenant" } = {}) {
  const { tenantId: tenantIdParam } = useParams();
  const isTenantVariant = variant === "tenant";
  const tenantId = isTenantVariant ? Number(tenantIdParam) : null;
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(
    isTenantVariant ? TENANT_ROLE_OPTIONS_FALLBACK : [],
  );
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [emailLookup, setEmailLookup] = useState(null);
  const [emailLookupLoading, setEmailLookupLoading] = useState(false);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) =>
      [
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
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  const loadData = useCallback(async () => {
    if (isTenantVariant && (!Number.isFinite(tenantId) || tenantId <= 0)) {
      setError("Не удалось определить компанию для списка пользователей.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [usersData, rolesData] = await Promise.allSettled([
        isTenantVariant ? getTenantUsers(tenantId) : getUsers(),
        isTenantVariant ? getTenantRoles(tenantId) : getRoles(),
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
        const loadedRoles =
          Array.isArray(rolesData.value) && rolesData.value.length > 0
            ? rolesData.value
            : TENANT_ROLE_OPTIONS_FALLBACK;

        setRoles(resolveRolesForVariant(variant, loadedRoles));
      } else if (isTenantVariant) {
        setRoles(TENANT_ROLE_OPTIONS_FALLBACK);
      }
    } finally {
      setLoading(false);
    }
  }, [isTenantVariant, tenantId, variant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = () => {
    const firstRole =
      roles.find((role) => role.name === "user")
      || roles[roles.length - 1]
      || TENANT_ROLE_OPTIONS_FALLBACK[2];

    const newUser = {
      ...emptyUser,
      id: null,
      isNew: true,
      temp_password: "",
      password: "",
      password_repeat: "",
      is_active: true,
      role_id: firstRole?.id || 1,
      role: firstRole?.name || "user",
      avatar_settings: DEFAULT_AVATAR_SETTINGS,
    };

    setSelectedUser(newUser);
    setForm(newUser);
    setError("");
    setEmailLookup(null);
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
    setEmailLookup(null);
  };

  const handleCloseEditor = () => {
    setSelectedUser(null);
    setForm(emptyUser);
    setError("");
    setDeleteModalOpen(false);
    setEmailLookup(null);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "email") {
      setEmailLookup(null);
    }
  };

  const handleEmailLookup = async () => {
    if (!isTenantVariant || !form.isNew) {
      return;
    }

    const email = String(form.email || "").trim();
    if (!email) {
      setEmailLookup(null);
      return;
    }

    try {
      setEmailLookupLoading(true);
      const result = await lookupTenantUserEmail(tenantId, email);
      setEmailLookup(result);
      setError("");
    } catch (lookupError) {
      console.error(lookupError);
      setEmailLookup(null);
    } finally {
      setEmailLookupLoading(false);
    }
  };

  const resolveApiErrorMessage = (requestError, fallback) => {
    const detail = requestError?.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (detail && typeof detail === "object" && detail.message) {
      return detail.message;
    }
    return fallback;
  };

  const validatePasswordFields = () => {
    const password = String(form.password || "");
    const passwordRepeat = String(form.password_repeat || "");

    if (!password && !passwordRepeat) return true;

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
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      if (!validatePasswordFields()) return;

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

      if (form.password) {
        payload.password = form.password;
      }

      if (form.isNew && emailLookup?.outcome === "dismissed") {
        payload.restore_dismissed = true;
      }

      const savedUser = form.id
        ? isTenantVariant
          ? await updateTenantUser(tenantId, form.id, payload)
          : await updateUser(form.id, payload)
        : isTenantVariant
          ? await createTenantUser(tenantId, payload)
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

      const cleanUpdated = {
        ...updated,
        password: "",
        password_repeat: "",
      };

      setSelectedUser(cleanUpdated);
      setForm(cleanUpdated);

      window.dispatchEvent(new CustomEvent("admin:users-updated"));
      window.dispatchEvent(new CustomEvent("user:profile-updated"));
    } catch (e) {
      console.error(e);

      const detail = e?.response?.data?.detail;
      if (detail?.code === "membership_dismissed") {
        setEmailLookup({ outcome: "dismissed", email: form.email });
        setError("Пользователь ранее работал в этой компании. Нажмите «Восстановить сотрудника».");
        return;
      }

      setError(
        resolveApiErrorMessage(
          e,
          form.id
            ? "Не удалось сохранить пользователя."
            : "Не удалось создать пользователя.",
        ),
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

  const handleRestoreDismissed = async () => {
    if (!form.isNew || emailLookup?.outcome !== "dismissed") {
      return;
    }

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
        is_active: true,
        role_id: form.role_id,
        avatar_url: form.avatar_url,
        avatar_settings: form.avatar_settings,
        restore_dismissed: true,
      };

      if (form.password) {
        payload.password = form.password;
      }

      const savedUser = await createTenantUser(tenantId, payload);
      const updated = normalizeUser(savedUser);
      setUsers((prev) => [normalizeExistingUser(updated), ...prev]);
      setSelectedUser({ ...updated, password: "", password_repeat: "" });
      setForm({ ...updated, password: "", password_repeat: "" });
      setEmailLookup(null);
      window.dispatchEvent(new CustomEvent("admin:users-updated"));
    } catch (e) {
      console.error(e);
      setError(resolveApiErrorMessage(e, "Не удалось восстановить сотрудника."));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!form?.id) return;

    try {
      setDeleting(true);
      setError("");

      if (isTenantVariant) {
        await deleteTenantUser(tenantId, form.id);
      } else {
        await deleteUser(form.id);
      }

      setUsers((prev) =>
        prev.filter((user) => String(user.id) !== String(form.id))
      );

      window.dispatchEvent(new CustomEvent("admin:users-updated"));

      handleCloseEditor();
    } catch (e) {
      console.error(e);
      setError("Не удалось отключить доступ сотрудника.");
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

      {isTenantVariant && form.isNew && emailLookup?.outcome === "found_existing" ? (
        <div style={infoStyles.infoBox}>
          Пользователь с таким email уже существует в платформе. Он будет добавлен только в текущую компанию.
        </div>
      ) : null}

      {isTenantVariant && form.isNew && emailLookup?.outcome === "already_member" ? (
        <div style={infoStyles.warningBox}>
          Пользователь уже добавлен в эту компанию.
        </div>
      ) : null}

      {isTenantVariant && form.isNew && emailLookup?.outcome === "dismissed" ? (
        <div style={infoStyles.warningBox}>
          <div>Пользователь ранее работал в этой компании.</div>
          <button
            type="button"
            style={infoStyles.restoreButton}
            onClick={handleRestoreDismissed}
            disabled={saving}
          >
            {saving ? "Восстановление..." : "Восстановить сотрудника"}
          </button>
        </div>
      ) : null}

      {emailLookupLoading ? (
        <div style={infoStyles.muted}>Проверка email...</div>
      ) : null}

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
          tenantId={isTenantVariant ? tenantId : null}
          saving={saving}
          deleting={deleting}
          onChange={handleChange}
          onEmailBlur={isTenantVariant && form.isNew ? handleEmailLookup : undefined}
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
                <div style={modalStyles.title}>Уволить сотрудника?</div>
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
              Сотруднику <b>{deletingUserName}</b> будет отключён доступ к этой компании.
              Глобальная учётная запись и история действий сохранятся.
            </div>

            <div style={modalStyles.warning}>
              Если сотрудник работает в других компаниях, доступ там сохранится.
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
                {deleting ? "Отключение..." : "Уволить сотрудника"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const infoStyles = {
  infoBox: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    fontSize: 13,
    lineHeight: 1.4,
  },
  warningBox: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    fontSize: 13,
    lineHeight: 1.4,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  restoreButton: {
    alignSelf: "flex-start",
    height: 34,
    padding: "0 14px",
    borderRadius: 8,
    border: "1px solid #fdba74",
    background: "#ffffff",
    color: "#9a3412",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  muted: {
    fontSize: 12,
    color: "#64748b",
  },
};

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