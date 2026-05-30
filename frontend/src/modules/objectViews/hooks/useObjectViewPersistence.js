import { useCallback, useState } from "react";

import * as designerApi from "../../designer/api/designerApi";
import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { buildObjectViewPayload } from "../services/buildObjectViewPayload";

function resolveViewActionError(err, fallbackMessage) {
  const message = getApiErrorMessage(err, fallbackMessage);
  const status = err?.response?.status;

  if (status === 403) {
    if (/Designer API/i.test(message)) {
      return "Настройка представления доступна пользователям с правами Studio";
    }
  }

  if (status === 409) {
    return `${message} Обновите страницу и повторите сохранение.`;
  }

  return message;
}

/**
 * Manual save and immediate view metadata actions (no autosave).
 */
export default function useObjectViewPersistence({ tenantId }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const saveView = useCallback(
    async (contract) => {
      const viewId = contract?.meta?.viewId;

      if (!tenantId || !viewId) {
        return { ok: false, reason: "no_view_id" };
      }

      setSaving(true);
      setSaveError("");

      try {
        const payload = buildObjectViewPayload(contract, { mode: "update" });
        const updated = await designerApi.updateView(tenantId, viewId, payload);

        return { ok: true, raw: updated };
      } catch (err) {
        const message = resolveViewActionError(
          err,
          "Не удалось сохранить представление",
        );
        setSaveError(message);
        return { ok: false, reason: "api_error", message };
      } finally {
        setSaving(false);
      }
    },
    [tenantId],
  );

  const renameView = useCallback(
    async (contract, newName) => {
      const viewId = contract?.meta?.viewId;
      const trimmedName = String(newName || "").trim();

      if (!tenantId || !viewId || !trimmedName) {
        return { ok: false, reason: "invalid_input" };
      }

      setActionLoading(true);
      setActionError("");

      try {
        const payload = { name: trimmedName };

        if (contract.meta.draftRevision != null) {
          payload.draft_revision = contract.meta.draftRevision;
        }

        const updated = await designerApi.updateView(tenantId, viewId, payload);

        return { ok: true, raw: updated };
      } catch (err) {
        const message = resolveViewActionError(
          err,
          "Не удалось переименовать представление",
        );
        setActionError(message);
        return { ok: false, reason: "api_error", message };
      } finally {
        setActionLoading(false);
      }
    },
    [tenantId],
  );

  const deleteView = useCallback(
    async (viewId) => {
      if (!tenantId || !viewId) {
        return { ok: false, reason: "invalid_input" };
      }

      setActionLoading(true);
      setActionError("");

      try {
        await designerApi.deleteView(tenantId, viewId);
        return { ok: true };
      } catch (err) {
        const message = resolveViewActionError(
          err,
          "Не удалось удалить представление",
        );
        setActionError(message);
        return { ok: false, reason: "api_error", message };
      } finally {
        setActionLoading(false);
      }
    },
    [tenantId],
  );

  const setDefaultView = useCallback(
    async (contract) => {
      const viewId = contract?.meta?.viewId;

      if (!tenantId || !viewId) {
        return { ok: false, reason: "no_view_id" };
      }

      setActionLoading(true);
      setActionError("");

      try {
        const payload = { is_default: true };

        if (contract.meta.draftRevision != null) {
          payload.draft_revision = contract.meta.draftRevision;
        }

        const updated = await designerApi.updateView(tenantId, viewId, payload);

        return { ok: true, raw: updated };
      } catch (err) {
        const message = resolveViewActionError(
          err,
          "Не удалось сделать представление по умолчанию",
        );
        setActionError(message);
        return { ok: false, reason: "api_error", message };
      } finally {
        setActionLoading(false);
      }
    },
    [tenantId],
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
