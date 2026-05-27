export type SidebarMode = "runtime" | "designer" | "admin" | "ai" | "system";

export type SidebarItemKind =
  | "item"
  | "section"
  | "group"
  | "divider"
  | "action";

export type SidebarActionKind =
  | "button"
  | "iconButton"
  | "toggle"
  | "menu";

/**
 * Serializable sidebar node for AppSidebar adapters.
 * UI layers map icon/meta to concrete components later.
 */
export type SidebarItemContract = {
  id: string;
  kind: SidebarItemKind;
  label: string;
  icon?: string;
  path?: string;
  active?: boolean;
  disabled?: boolean;
  children?: SidebarItemContract[];
  parentId?: string;
  level?: number;
  order?: number;
  isSystem?: boolean;
  isCustom?: boolean;
  isHidden?: boolean;
  isExpanded?: boolean;
  isEditable?: boolean;
  isDraggable?: boolean;
  isDroppable?: boolean;
  iconType?: string;
  iconFileUrl?: string;
  pageId?: string | number;
  systemKey?: string;
  actionKey?: string;
  routeKey?: string;
  meta?: Record<string, unknown>;
};

export type SidebarActionContract = {
  id: string;
  label: string;
  kind: SidebarActionKind;
  icon?: string;
  tooltip?: string;
  disabled?: boolean;
  hidden?: boolean;
  actionKey: string;
  meta?: Record<string, unknown>;
};
