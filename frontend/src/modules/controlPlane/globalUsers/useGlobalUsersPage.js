import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getGlobalUser,
  getGlobalUsers,
  resetGlobalUserPassword,
  updateGlobalUserStatus,
} from "../api/globalUsersApi.js";
import { getApiErrorMessage } from "../../designer/api/platformApiClient.js";
import {
  matchesGlobalUserSearch,
  normalizeGlobalUser,
} from "./globalUserUtils.js";

export default function useGlobalUsersPage({ initialUserId = null } = {}) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getGlobalUsers();
      const normalized = Array.isArray(data) ? data.map((user) => normalizeGlobalUser(user)) : [];
      setUsers(normalized);
      setSelectedUserId((previous) => {
        if (previous != null && normalized.some((user) => String(user.id) === String(previous))) {
          return previous;
        }
        return normalized[0]?.id ?? null;
      });
    } catch (requestError) {
      setUsers([]);
      setSelectedUserId(null);
      setError(getApiErrorMessage(requestError, "Не удалось загрузить глобальных пользователей"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSelectedUser = useCallback(async (userId) => {
    if (userId == null) {
      setSelectedUser(null);
      return;
    }

    try {
      setDetailLoading(true);
      const data = await getGlobalUser(userId);
      const normalized = normalizeGlobalUser(data);
      setSelectedUser(normalized);
      setUsers((previous) =>
        previous.map((user) => (String(user.id) === String(userId) ? { ...user, ...normalized } : user)),
      );
    } catch (requestError) {
      setSelectedUser(null);
      setError(getApiErrorMessage(requestError, "Не удалось загрузить карточку пользователя"));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (initialUserId != null && !loading) {
      setSelectedUserId(initialUserId);
    }
  }, [initialUserId, loading]);

  useEffect(() => {
    loadSelectedUser(selectedUserId).catch(() => {});
  }, [selectedUserId, loadSelectedUser]);

  const filteredUsers = useMemo(
    () => users.filter((user) => matchesGlobalUserSearch(user, searchQuery)),
    [users, searchQuery],
  );

  const handleSelectUser = useCallback((user) => {
    setSelectedUserId(user?.id ?? null);
    setActionMessage("");
    setError("");
  }, []);

  const handleBlock = useCallback(async () => {
    if (!selectedUser?.id) {
      return;
    }

    try {
      setActionLoading(true);
      setActionMessage("");
      const updated = await updateGlobalUserStatus(selectedUser.id, false);
      const normalized = normalizeGlobalUser(updated);
      setSelectedUser(normalized);
      setUsers((previous) =>
        previous.map((user) => (String(user.id) === String(normalized.id) ? { ...user, ...normalized } : user)),
      );
      setActionMessage("Пользователь заблокирован");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось заблокировать пользователя"));
    } finally {
      setActionLoading(false);
    }
  }, [selectedUser]);

  const handleUnblock = useCallback(async () => {
    if (!selectedUser?.id) {
      return;
    }

    try {
      setActionLoading(true);
      setActionMessage("");
      const updated = await updateGlobalUserStatus(selectedUser.id, true);
      const normalized = normalizeGlobalUser(updated);
      setSelectedUser(normalized);
      setUsers((previous) =>
        previous.map((user) => (String(user.id) === String(normalized.id) ? { ...user, ...normalized } : user)),
      );
      setActionMessage("Пользователь разблокирован");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось разблокировать пользователя"));
    } finally {
      setActionLoading(false);
    }
  }, [selectedUser]);

  const handleResetPassword = useCallback(async () => {
    if (!selectedUser?.id) {
      return;
    }

    try {
      setActionLoading(true);
      setActionMessage("");
      const result = await resetGlobalUserPassword(selectedUser.id);
      setActionMessage(result?.message || "Пароль сброшен");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось сбросить пароль"));
    } finally {
      setActionLoading(false);
    }
  }, [selectedUser]);

  return {
    users: filteredUsers,
    selectedUserId,
    selectedUser,
    searchQuery,
    loading,
    detailLoading,
    actionLoading,
    error,
    actionMessage,
    setSearchQuery,
    handleSelectUser,
    handleBlock,
    handleUnblock,
    handleResetPassword,
    reload: loadUsers,
  };
}
