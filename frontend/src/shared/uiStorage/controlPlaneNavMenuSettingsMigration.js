/**
 * Migrates Control Plane sidebar settings when navigation item ids change.
 */

export const CONTROL_PLANE_NAV_MENU_ID_MIGRATIONS = [
  { from: "cp-releases", to: "cp-group-releases" },
  { from: "cp-releases-review", to: "cp-group-releases" },
  { from: "cp-releases-versions", to: "cp-group-companies" },
];

export function migrateControlPlaneSystemMenuSettings(settings = {}) {
  const source =
    settings && typeof settings === "object" ? { ...settings } : {};
  let changed = false;

  for (const { from, to } of CONTROL_PLANE_NAV_MENU_ID_MIGRATIONS) {
    const legacy = source[from];
    if (!legacy || typeof legacy !== "object") {
      continue;
    }

    const current = source[to];
    if (!current || typeof current !== "object") {
      source[to] = { ...legacy };
      changed = true;
    } else {
      const merged = { ...legacy, ...current };
      if (JSON.stringify(merged) !== JSON.stringify(current)) {
        source[to] = merged;
        changed = true;
      }
    }

    delete source[from];
    changed = true;
  }

  return { settings: source, changed };
}
