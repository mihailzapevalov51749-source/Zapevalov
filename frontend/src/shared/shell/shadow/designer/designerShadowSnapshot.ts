export type DesignerShadowSnapshot = {
  mode: "designer";
  pathname: string;
  activeItemId: string | number | null;
  activeDesignerObjectId: string | number | null;
  collapsed: boolean;
  navigation: unknown[];
  header: {
    title: string;
    subtitle: string;
    modeActions: unknown[];
    pageActions: unknown[];
  };
  capabilities: Record<string, unknown>;
  geometry: {
    sidebarWidth: number;
    workspaceLeftOffset: number;
    workspaceTopOffset: number;
  };
  timestamp: number;
};

export const DESIGNER_SHADOW_REQUIRED_PATHS = [
  "mode",
  "pathname",
  "activeItemId",
  "activeDesignerObjectId",
  "collapsed",
  "navigation",
  "header.title",
  "header.subtitle",
  "header.modeActions",
  "header.pageActions",
  "capabilities",
  "geometry.sidebarWidth",
  "geometry.workspaceLeftOffset",
  "geometry.workspaceTopOffset",
  "timestamp",
] as const;

export function listMissingDesignerSnapshotFields(
  snapshot: Partial<DesignerShadowSnapshot> | null | undefined,
): string[] {
  if (!snapshot || typeof snapshot !== "object") {
    return [...DESIGNER_SHADOW_REQUIRED_PATHS];
  }

  const missing: string[] = [];
  const source = snapshot as Record<string, unknown>;

  for (const path of DESIGNER_SHADOW_REQUIRED_PATHS) {
    const parts = path.split(".");
    let current: unknown = source;

    for (const part of parts) {
      if (
        !current ||
        typeof current !== "object" ||
        !(part in (current as Record<string, unknown>))
      ) {
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
