import { getCurrentUserId } from "../../../../communication/domain/messageItemUtils.js";
import {
  IMPORT_DEFAULT_CURRENT_USER_VALUE,
} from "./importDefaultValueConstants.js";

/**
 * @param {unknown} rawValue
 * @param {{ currentUserId?: number | null }} [context]
 */
export function resolveImportDefaultUserId(rawValue, context = {}) {
  const token = String(rawValue ?? "").trim();

  if (token === IMPORT_DEFAULT_CURRENT_USER_VALUE || token === "current_user") {
    const fromContext = Number(context.currentUserId);
    const fromStorage = Number(getCurrentUserId());

    const userId = Number.isFinite(fromContext) && fromContext > 0
      ? fromContext
      : fromStorage;

    if (!Number.isFinite(userId) || userId <= 0) {
      return { ok: false, error: "Текущий пользователь недоступен" };
    }

    return { ok: true, value: userId };
  }

  const userId = Number(rawValue);

  if (!Number.isFinite(userId) || userId <= 0) {
    return { ok: false, error: "Пользователь не выбран" };
  }

  return { ok: true, value: userId };
}
