const YASII_PINNED_KEY = "yasnopro-yasii-pinned";
const YASII_PRE_WORKSPACE_PATH_KEY = "yasnopro-yasii-pre-workspace-path";

export const YASII_PINNED_CHANGED_EVENT = "yasnopro:yasii-pinned-changed";

export function readYasiiPinned() {
  try {
    return localStorage.getItem(YASII_PINNED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeYasiiPinned(pinned) {
  try {
    localStorage.setItem(YASII_PINNED_KEY, String(Boolean(pinned)));
  } catch {
    // ignore storage errors
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(YASII_PINNED_CHANGED_EVENT, {
        detail: { pinned: Boolean(pinned) },
      }),
    );
  }
}

export function readYasiiPreWorkspacePath() {
  try {
    return localStorage.getItem(YASII_PRE_WORKSPACE_PATH_KEY) || "";
  } catch {
    return "";
  }
}

export function writeYasiiPreWorkspacePath(path) {
  const normalized = String(path ?? "").trim();
  if (!normalized) {
    return;
  }

  try {
    localStorage.setItem(YASII_PRE_WORKSPACE_PATH_KEY, normalized);
  } catch {
    // ignore storage errors
  }
}
