import { LAYOUT_MODES, type LayoutMode } from "./layoutModes";
import { LAYOUT_TOKENS } from "./layoutTokens";

export type ResolveShellGeometryParams = {
  mode: LayoutMode;
  collapsed?: boolean;
  explicitWorkspaceLeftOffset?: number;
  explicitWorkspaceTopOffset?: number;
};

export const SHELL_GEOMETRY_CONTRACT = {
  runtime: {
    sidebarExpandedWidth: LAYOUT_TOKENS.runtime.sidebarExpandedWidth,
    sidebarCollapsedWidth: LAYOUT_TOKENS.runtime.sidebarCollapsedWidth,
    workspaceTopOffset: LAYOUT_TOKENS.runtime.workspaceTopOffset,
  },
  designer: {
    sidebarWidth: LAYOUT_TOKENS.designer.sidebarWidth,
    sidebarCollapsedWidth: LAYOUT_TOKENS.designer.sidebarCollapsedWidth,
    workspaceTopOffset: LAYOUT_TOKENS.designer.workspaceTopOffset,
  },
} as const;

export function resolveSidebarWidth(params: {
  mode: LayoutMode;
  collapsed?: boolean;
}): number {
  if (params.mode === LAYOUT_MODES.DESIGNER) {
    return params.collapsed
      ? LAYOUT_TOKENS.designer.sidebarCollapsedWidth
      : LAYOUT_TOKENS.designer.sidebarWidth;
  }

  return params.collapsed
    ? LAYOUT_TOKENS.runtime.sidebarCollapsedWidth
    : LAYOUT_TOKENS.runtime.sidebarExpandedWidth;
}

export function resolveWorkspaceLeftOffset(
  params: ResolveShellGeometryParams,
): number {
  if (typeof params.explicitWorkspaceLeftOffset === "number") {
    return params.explicitWorkspaceLeftOffset;
  }

  if (params.mode === LAYOUT_MODES.DESIGNER) {
    return 0;
  }

  return resolveSidebarWidth({
    mode: params.mode,
    collapsed: params.collapsed,
  });
}

export function resolveWorkspaceTopOffset(params: ResolveShellGeometryParams): number {
  if (typeof params.explicitWorkspaceTopOffset === "number") {
    return params.explicitWorkspaceTopOffset;
  }

  if (params.mode === LAYOUT_MODES.DESIGNER) {
    return LAYOUT_TOKENS.designer.workspaceTopOffset;
  }

  return LAYOUT_TOKENS.runtime.workspaceTopOffset;
}
