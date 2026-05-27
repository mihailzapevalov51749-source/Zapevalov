export type RuntimeShadowSnapshot = {
  mode: "runtime";
  pathname: string;
  portal: Record<string, unknown> | null;
  page: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
  navigation: unknown[];
  activePageId: string | number | null;
  activeItemId: string | number | null;
  collapsed: boolean;
  search: {
    enabled: boolean;
    value: string;
  };
  notifications: {
    enabled: boolean;
    unreadCount: number | null;
  };
  geometry: {
    sidebarWidth: number;
    workspaceLeftOffset: number;
    workspaceTopOffset: number;
  };
  timestamp: number;
};

export const RUNTIME_SHADOW_REQUIRED_PATHS = [
  "mode",
  "pathname",
  "portal",
  "page",
  "user",
  "navigation",
  "activePageId",
  "activeItemId",
  "collapsed",
  "search.enabled",
  "search.value",
  "notifications.enabled",
  "notifications.unreadCount",
  "geometry.sidebarWidth",
  "geometry.workspaceLeftOffset",
  "geometry.workspaceTopOffset",
  "timestamp",
] as const;

export function listMissingRuntimeSnapshotFields(
  snapshot: Partial<RuntimeShadowSnapshot> | null | undefined,
): string[] {
  if (!snapshot || typeof snapshot !== "object") {
    return [...RUNTIME_SHADOW_REQUIRED_PATHS];
  }

  const missing: string[] = [];
  const source = snapshot as Record<string, unknown>;

  for (const path of RUNTIME_SHADOW_REQUIRED_PATHS) {
    const parts = path.split(".");
    let current: unknown = source;

    for (const part of parts) {
      if (!current || typeof current !== "object" || !(part in (current as Record<string, unknown>))) {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (typeof current === "undefined") {
      missing.push(path);
    }
  }

  return missing;
}
