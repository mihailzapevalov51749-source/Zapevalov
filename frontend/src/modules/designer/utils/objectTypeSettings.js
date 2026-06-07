export const SHOW_IN_NAVIGATION_KEY = "show_in_navigation";

export function resolveShowInNavigation(settings) {
  if (!settings || typeof settings !== "object") {
    return false;
  }
  return settings[SHOW_IN_NAVIGATION_KEY] === true;
}

export function withShowInNavigation(settings, showInNavigation) {
  const merged = settings && typeof settings === "object" ? { ...settings } : {};
  merged[SHOW_IN_NAVIGATION_KEY] = Boolean(showInNavigation);
  return merged;
}

export function defaultObjectTypeSettings() {
  return { [SHOW_IN_NAVIGATION_KEY]: false };
}
