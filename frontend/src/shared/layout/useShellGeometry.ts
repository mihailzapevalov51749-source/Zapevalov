import { useMemo } from "react";

import type { LayoutMode } from "./layoutModes";
import {
  resolveSidebarWidth,
  resolveWorkspaceLeftOffset,
  resolveWorkspaceTopOffset,
} from "./shellGeometry";
import {
  resolveCommentsPanelWidth,
  resolveEntityCardInset,
  resolveOverlayInsets,
} from "./overlayGeometry";
import { TRANSITION_TOKENS } from "./transitionTokens";
import { Z_INDEX_TOKENS } from "./zIndexTokens";

export type UseShellGeometryParams = {
  mode: LayoutMode;
  collapsed?: boolean;
  workspaceLeftOffset?: number;
  workspaceTopOffset?: number;
};

export function useShellGeometry(params: UseShellGeometryParams) {
  return useMemo(() => {
    const baseParams = {
      mode: params.mode,
      collapsed: params.collapsed,
      explicitWorkspaceLeftOffset: params.workspaceLeftOffset,
      explicitWorkspaceTopOffset: params.workspaceTopOffset,
    };

    const sidebarWidth = resolveSidebarWidth({
      mode: params.mode,
      collapsed: params.collapsed,
    });
    const workspaceLeftOffset = resolveWorkspaceLeftOffset(baseParams);
    const workspaceTopOffset = resolveWorkspaceTopOffset(baseParams);
    const overlayInsets = resolveOverlayInsets(baseParams);
    const commentsPanelWidth = resolveCommentsPanelWidth();
    const entityCardInset = resolveEntityCardInset();

    return {
      sidebarWidth,
      workspaceLeftOffset,
      workspaceTopOffset,
      overlayInsets,
      commentsPanelWidth,
      entityCardInset,
      transitions: TRANSITION_TOKENS,
      zIndex: Z_INDEX_TOKENS,
    };
  }, [
    params.collapsed,
    params.mode,
    params.workspaceLeftOffset,
    params.workspaceTopOffset,
  ]);
}
