import type { HeaderActionContract, HeaderMode } from "./headerTypes";

export type HeaderBreadcrumbContract = {
  id: string;
  label: string;
  path?: string;
};

export type HeaderPathChainItem = {
  id?: string;
  label: string;
  path?: string;
  active?: boolean;
  meta?: Record<string, unknown>;
};

export type HeaderTenantContract = {
  id?: string;
  name?: string;
  label?: string;
};

export type HeaderUserContract = {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
};

export type HeaderEditableTitleContract = {
  enabled: boolean;
  value?: string;
  draftValue?: string;
  placeholder?: string;
  isEditing?: boolean;
  saveActionKey?: string;
  cancelActionKey?: string;
  editActionKey?: string;
};

export type HeaderSearchContract = {
  enabled: boolean;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  actionKey?: string;
  changeActionKey?: string;
  clearActionKey?: string;
  submitActionKey?: string;
  openFirstActionKey?: string;
};

export type HeaderNotificationContract = {
  enabled: boolean;
  unreadCount?: number;
  disabled?: boolean;
  actionKey?: string;
  /** When false, badge is hidden even if unreadCount > 0. Defaults to visible when count > 0. */
  badge?: boolean;
  meta?: Record<string, unknown>;
};

export type HeaderEditModeContract = {
  enabled: boolean;
  active: boolean;
  enterActionKey?: string;
  exitActionKey?: string;
  saveActionKey?: string;
  settingsActionKey?: string;
};

export type HeaderCapabilitiesContract = {
  canSearch?: boolean;
  canEditPage?: boolean;
  canEditTitle?: boolean;
  canViewNotifications?: boolean;
  canOpenSettings?: boolean;
  canUsePageActions?: boolean;
  canSwitchMode?: boolean;
};

/**
 * Mode-agnostic AppHeader input contract.
 */
export type AppHeaderContract = {
  mode: HeaderMode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: HeaderBreadcrumbContract[];
  pathChain?: HeaderPathChainItem[];
  leftActions?: HeaderActionContract[];
  contextActions?: HeaderActionContract[];
  modeActions?: HeaderActionContract[];
  rightActions?: HeaderActionContract[];
  pageActions?: HeaderActionContract[];
  editableTitle?: HeaderEditableTitleContract;
  search?: HeaderSearchContract;
  notifications?: HeaderNotificationContract;
  editMode?: HeaderEditModeContract;
  capabilities?: HeaderCapabilitiesContract;
  tenant?: HeaderTenantContract;
  user?: HeaderUserContract;
  meta?: Record<string, unknown>;
};
