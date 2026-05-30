/**
 * Cross-mode search role helpers (S3).
 * Backend is the source of truth; frontend hints only.
 */

export function normalizeUserRoleName(user) {
  return String(user?.role || user?.role_name || user?.roleName || "")
    .trim()
    .toLowerCase();
}

export function isCrossModeSearchUser(user) {
  const roleName = normalizeUserRoleName(user);
  return roleName === "admin" || roleName === "superadmin";
}

/**
 * @param {"runtime"|"designer"} mode
 * @param {object | null | undefined} user
 * @returns {Array<"runtime"|"designer">}
 */
export function resolveRequestedSearchDomains(mode, user) {
  if (!isCrossModeSearchUser(user)) {
    return ["runtime"];
  }

  if (mode === "designer") {
    return ["designer", "runtime"];
  }

  return ["runtime", "designer"];
}

/**
 * @param {"runtime"|"designer"} mode
 * @param {object | null | undefined} user
 */
export function canUseHeaderSearch(mode, user) {
  if (mode !== "designer") {
    return true;
  }

  return isCrossModeSearchUser(user);
}

export function getCachedCurrentUser() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawUser = window.localStorage.getItem("currentUser");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}
