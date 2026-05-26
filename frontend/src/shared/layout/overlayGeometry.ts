import type { LayoutMode } from "./layoutModes";
import { LAYOUT_TOKENS } from "./layoutTokens";
import {
  resolveWorkspaceLeftOffset,
  resolveWorkspaceTopOffset,
  type ResolveShellGeometryParams,
} from "./shellGeometry";

export type OverlayInsets = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type ResolveOverlayInsetsParams = ResolveShellGeometryParams & {
  mode: LayoutMode;
};

export const OVERLAY_GEOMETRY_CONTRACT = {
  commentsPanelWidth: LAYOUT_TOKENS.overlay.commentsPanelWidth,
  entityCardInset: LAYOUT_TOKENS.overlay.entityCardInset,
  defaultInsets: {
    left: 0,
    top: LAYOUT_TOKENS.overlay.workspaceTopOffset,
    right: 0,
    bottom: 0,
  },
} as const;

export function resolveOverlayInsets(
  params: ResolveOverlayInsetsParams,
): OverlayInsets {
  return {
    left: resolveWorkspaceLeftOffset(params),
    top: resolveWorkspaceTopOffset(params),
    right: 0,
    bottom: 0,
  };
}

export function resolveCommentsPanelWidth(): number {
  return LAYOUT_TOKENS.overlay.commentsPanelWidth;
}

export function resolveEntityCardInset(): number {
  return LAYOUT_TOKENS.overlay.entityCardInset;
}
