import { getUsers } from "../../../../api/authApi";
import { normalizeUser } from "../../../fieldTypes/user/userUtils";

function getUserId(user) {
  return String(user?.userId ?? user?.user_id ?? user?.id ?? "").trim();
}

/**
 * @returns {Promise<Map<string, string>>}
 */
export async function loadExportUsersMap() {
  try {
    const data = await getUsers();
    const list = Array.isArray(data) ? data : data?.items || [];
    const map = new Map();

    for (const item of list) {
      const normalized = normalizeUser(item);
      const userId = getUserId(normalized);

      if (!userId || normalized.name === "—") {
        continue;
      }

      map.set(userId, normalized.name);
    }

    return map;
  } catch {
    return new Map();
  }
}

/**
 * @param {unknown} value
 * @param {Map<string, string>} usersMap
 */
export function resolveExportUserLabel(value, usersMap) {
  const normalized = normalizeUser(value);
  const userId = getUserId(normalized);

  if (userId && usersMap.has(userId)) {
    return usersMap.get(userId);
  }

  return normalized.name === "—" ? "" : normalized.name;
}
