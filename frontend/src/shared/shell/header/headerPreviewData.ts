import type { AppHeaderContract } from "./headerContracts";
import {
  createDesignerHeaderContract,
  createRuntimeHeaderContract,
} from "./headerAdapters";

export type HeaderPreviewOptions = {
  title?: string;
  subtitle?: string;
  searchQuery?: string;
  notificationUnreadCount?: number;
  isEditMode?: boolean;
  isPageTitleEditable?: boolean;
  pageTitleDraft?: string;
  showBackButton?: boolean;
};

const PREVIEW_USER = {
  name: "Михаил",
  email: "demo@example.com",
};

const PREVIEW_PATHNAME = "/portal/1/page/1";
const PREVIEW_TENANT_ID = 1;

function baseRuntimeOptions(
  overrides: HeaderPreviewOptions = {}
): Parameters<typeof createRuntimeHeaderContract>[0] {
  return {
    title: overrides.title ?? "Проекты",
    subtitle: overrides.subtitle ?? "",
    pathname: PREVIEW_PATHNAME,
    tenantId: PREVIEW_TENANT_ID,
    user: PREVIEW_USER,
    searchQuery: overrides.searchQuery ?? "",
    showBackButton: overrides.showBackButton ?? false,
    notificationUnreadCount: overrides.notificationUnreadCount ?? 0,
    canSearch: true,
    canEditPage: true,
    canEditTitle: true,
    canViewNotifications: true,
    canOpenSettings: true,
    isEditMode: overrides.isEditMode ?? false,
    isPageTitleEditable: overrides.isPageTitleEditable ?? false,
    pageTitleDraft: overrides.pageTitleDraft,
    onSearchChangeKey: "search-change",
    onSearchClearKey: "search-clear",
    onEnterEditModeKey: "enter-edit-mode",
    onExitEditModeKey: "exit-edit-mode",
    onOpenSettingsKey: "open-page-settings",
    onEditTitleKey: "edit-title",
    onSaveTitleKey: "save-title",
    onCancelTitleKey: "cancel-title-edit",
    onSavePageKey: "save-page",
    pathChain: [
      { label: "Проекты", path: "/portal/1/page/1" },
      { label: "СДС", path: "/portal/1/page/12" },
      { label: "График работ" },
    ],
    ...overrides,
  };
}

/** Runtime header — normal state (no edit, empty search). */
export function createRuntimeHeaderNormalPreviewContract(): AppHeaderContract {
  return createRuntimeHeaderContract(
    baseRuntimeOptions({
      searchQuery: "",
      notificationUnreadCount: 0,
      isEditMode: false,
      isPageTitleEditable: false,
    })
  );
}

/** Runtime header — title editing row visible. */
export function createRuntimeHeaderEditTitlePreviewContract(): AppHeaderContract {
  return createRuntimeHeaderContract({
    ...baseRuntimeOptions({
      showBackButton: true,
      isEditMode: true,
      isPageTitleEditable: true,
      pageTitleDraft: "Главная страница",
    }),
    titlePlaceholder: "Название страницы",
  });
}

/** Runtime header — search value + notifications badge (99+). */
export function createRuntimeHeaderSearchNotificationsPreviewContract(): AppHeaderContract {
  const contract = createRuntimeHeaderContract(
    baseRuntimeOptions({
      searchQuery: "договор",
      notificationUnreadCount: 128,
      isEditMode: false,
    })
  );

  return {
    ...contract,
    search: {
      ...contract.search,
      enabled: true,
      value: "договор",
      placeholder: "Поиск по системе...",
      actionKey: "search",
      clearActionKey: "search-clear",
      readOnly: true,
    },
    notifications: {
      ...contract.notifications,
      enabled: true,
      unreadCount: 128,
      actionKey: "notifications",
      badge: true,
    },
  };
}

/** Designer header — normal analyst mode. */
export function createDesignerHeaderNormalPreviewContract(): AppHeaderContract {
  return createDesignerHeaderContract({
    title: "Типы объектов",
    subtitle: "",
    pathname: "/designer/tenant/1/object-types",
    tenantId: PREVIEW_TENANT_ID,
    user: PREVIEW_USER,
    pathChain: [
      { label: "Типы объектов", path: "/designer/tenant/1/object-types" },
      { label: "CRM", path: "/designer/tenant/1/object-types/crm/general" },
      { label: "Сделка", path: "/designer/tenant/1/object-types/crm/deal/general" },
      { label: "Поля", path: "/designer/tenant/1/object-types/crm/deal/fields" },
      { label: "Сумма" },
    ],
  });
}

/** Designer header — edit mode visual (preview-only contract override). */
export function createDesignerHeaderEditModePreviewContract(): AppHeaderContract {
  const base = createDesignerHeaderContract({
    title: "Типы объектов",
    subtitle: "",
    pathname: "/designer/tenant/1/object-types",
    tenantId: PREVIEW_TENANT_ID,
    user: PREVIEW_USER,
    pathChain: [
      { label: "Типы объектов", path: "/designer/tenant/1/object-types" },
      { label: "CRM", path: "/designer/tenant/1/object-types/crm/general" },
      { label: "Сделка", path: "/designer/tenant/1/object-types/crm/deal/general" },
      { label: "Поля" },
    ],
  });

  return {
    ...base,
    editMode: {
      enabled: true,
      active: true,
      enterActionKey: "enter-edit-mode",
      exitActionKey: "exit-edit-mode",
      saveActionKey: "save-page",
      settingsActionKey: "open-page-settings",
    },
    capabilities: {
      canSearch: false,
      canEditPage: true,
      canEditTitle: false,
      canViewNotifications: false,
      canOpenSettings: true,
      canUsePageActions: true,
      canSwitchMode: true,
    },
    pageActions: [
      {
        id: "save-page",
        kind: "button",
        label: "Сохранить",
        actionKey: "save-page",
        variant: "success",
      },
      {
        id: "open-page-settings",
        kind: "iconButton",
        icon: "settings",
        label: "Настройки",
        actionKey: "open-page-settings",
      },
    ],
    editableTitle: {
      enabled: true,
      value: "Типы объектов",
      isEditing: false,
      editActionKey: "edit-title",
      saveActionKey: "save-title",
      cancelActionKey: "cancel-title-edit",
    },
  };
}
