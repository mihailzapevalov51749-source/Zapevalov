import { getUsers } from "../../../../api/authApi.js";
import { normalizeUser } from "../../../fieldTypes/user/userUtils.js";

function normalizeLookupToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * @returns {Promise<{ byEmail: Map<string, number[]>, byName: Map<string, number[]> }>}
 */
export async function loadImportUsersIndex() {
  const data = await getUsers();
  const list = Array.isArray(data) ? data : data?.items || [];
  const byEmail = new Map();
  const byName = new Map();

  for (const item of list) {
    const normalized = normalizeUser(item);
    const userId = Number(
      normalized.userId ?? item?.user_id ?? item?.id ?? NaN,
    );

    if (!Number.isFinite(userId) || userId <= 0) {
      continue;
    }

    const email = normalizeLookupToken(item?.email ?? normalized.email);
    const name = normalizeLookupToken(
      normalized.name === "—" ? "" : normalized.name,
    );

    if (email) {
      const bucket = byEmail.get(email) || [];
      bucket.push(userId);
      byEmail.set(email, bucket);
    }

    if (name) {
      const bucket = byName.get(name) || [];
      bucket.push(userId);
      byName.set(name, bucket);
    }
  }

  return { byEmail, byName };
}

/**
 * @param {unknown} rawValue
 * @param {{ byEmail: Map<string, number[]>, byName: Map<string, number[]> }} index
 */
export function resolveImportUserId(rawValue, index) {
  const token = normalizeLookupToken(rawValue);

  if (!token) {
    return { ok: false, error: "Пустое значение" };
  }

  let matches = [];

  if (token.includes("@")) {
    matches = index.byEmail.get(token) || [];
  } else {
    matches = index.byName.get(token) || [];
  }

  if (matches.length !== 1) {
    return { ok: false, error: "Пользователь не найден однозначно" };
  }

  return { ok: true, value: matches[0] };
}
