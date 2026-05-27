import type {
  SidebarActionContract,
  SidebarItemContract,
  SidebarMode,
} from "./sidebarTypes";

export type SidebarBrandContract = {
  title: string;
  subtitle?: string;
  logoSrc?: string;
  logoAlt?: string;
};

export type SidebarSectionContract = {
  id: string;
  title?: string;
  items: SidebarItemContract[];
};

export type SidebarCapabilitiesContract = {
  canEditMenu?: boolean;
  canCreateItem?: boolean;
  canOpenSettings?: boolean;
  canDragItems?: boolean;
  canScaleMenu?: boolean;
};

/**
 * Mode-agnostic AppSidebar input contract.
 * Adapters produce this shape from Runtime/Designer (and future) sources.
 */
export type AppSidebarContract = {
  mode: SidebarMode;
  collapsed: boolean;
  brand: SidebarBrandContract;
  sections: SidebarSectionContract[];
  footerActions: SidebarItemContract[];
  onToggleCollapse: () => void;
  editMode?: boolean;
  menuScale?: number;
  activeItemId?: string;
  activePageId?: string | number;
  actions?: SidebarActionContract[];
  capabilities?: SidebarCapabilitiesContract;
};
