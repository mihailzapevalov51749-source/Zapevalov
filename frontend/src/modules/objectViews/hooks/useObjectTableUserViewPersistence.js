import { useCallback, useState } from "react";

import {
  deleteUserTableView,
  getStoredCurrentUserId,
  renameUserTableView,
  setUserDefaultTableView,
  updateUserTableViewContract,
} from "../table/preferences/objectTableUserViewsStorage";

/**
 * Office-only persistence for user table representations (localStorage).
 */
export default function useObjectTableUserViewPersistence({
  tenantId,
  objectTypeKey,
  userId = getStoredCurrentUserId(),
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const scope = useCallback(
    () => ({
      tenantId,
      userId,
      objectTypeKey,
    }),
    [tenantId, userId, objectTypeKey],
  );

  const saveView = useCallback(
    async (contract) => {
      const userViewId = contract?.meta?.userViewId;

      if (!tenantId || !objectTypeKey || !userViewId) {
        return { ok: false, reason: "no_user_view" };
      }

      setSaving(true);
      setSaveError("");

      try {
        const result = updateUserTableViewContract(scope(), userViewId, contract);

        if (!result.ok) {
          setSaveError("Пользовательское представление не найдено");
          return result;
        }

        return { ok: true };
      } catch (err) {
        const message = "Не удалось сохранить представление";
        setSaveError(message);
        return { ok: false, reason: "storage_error", message };
      } finally {
        setSaving(false);
      }
    },
    [tenantId, objectTypeKey, scope],
  );

  const renameView = useCallback(
    async (contract, newName) => {
      const userViewId = contract?.meta?.userViewId;
      const trimmedName = String(newName || "").trim();

      if (!tenantId || !objectTypeKey || !userViewId || !trimmedName) {
        return { ok: false, reason: "invalid_input" };
      }

      setActionLoading(true);
      setActionError("");

      try {
        const result = renameUserTableView(scope(), userViewId, trimmedName);

        if (!result.ok) {
          setActionError("Не удалось переименовать представление");
        }

        return result;
      } catch {
        const message = "Не удалось переименовать представление";
        setActionError(message);
        return { ok: false, reason: "storage_error", message };
      } finally {
        setActionLoading(false);
      }
    },
    [tenantId, objectTypeKey, scope],
  );

  const deleteView = useCallback(
    async (userViewId) => {
      if (!tenantId || !objectTypeKey || !userViewId) {
        return { ok: false, reason: "invalid_input" };
      }

      setActionLoading(true);
      setActionError("");

      try {
        const result = deleteUserTableView(scope(), userViewId);

        if (!result.ok) {
          setActionError("Не удалось удалить представление");
        }

        return result;
      } catch {
        const message = "Не удалось удалить представление";
        setActionError(message);
        return { ok: false, reason: "storage_error", message };
      } finally {
        setActionLoading(false);
      }
    },
    [tenantId, objectTypeKey, scope],
  );

  const setDefaultView = useCallback(
    async (contract) => {
      const viewKey = contract?.key;

      if (!tenantId || !objectTypeKey || !viewKey) {
        return { ok: false, reason: "invalid_input" };
      }

      setActionLoading(true);
      setActionError("");

      try {
        const result = setUserDefaultTableView(scope(), viewKey);

        if (!result.ok) {
          setActionError("Не удалось назначить представление по умолчанию");
        }

        return result;
      } catch {
        const message = "Не удалось назначить представление по умолчанию";
        setActionError(message);
        return { ok: false, reason: "storage_error", message };
      } finally {
        setActionLoading(false);
      }
    },
    [tenantId, objectTypeKey, scope],
  );

  return {
    saving,
    saveError,
    actionLoading,
    actionError,
    saveView,
    renameView,
    deleteView,
    setDefaultView,
  };
}
