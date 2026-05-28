import type {
  AppHeaderContract,
  HeaderCapabilitiesContract,
  HeaderBreadcrumbContract,
  HeaderEditModeContract,
  HeaderEditableTitleContract,
  HeaderNotificationContract,
  HeaderPathChainItem,
  HeaderSearchContract,
  HeaderTenantContract,
  HeaderUserContract,
} from "./headerContracts";
import type { HeaderActionContract } from "./headerTypes";
import { HEADER_MODES } from "./headerMode";

type UnknownRecord = Record<string, unknown>;

/**
 * Runtime header input aligned with WorkspaceTopBar / PortalPageView data sources.
 */
export type RuntimeHeaderAdapterInput = {
  pathname?: string;
  title?: string;
  subtitle?: string;
  breadcrumbs?: unknown[];
  pathChain?: unknown[];
  portal?: unknown;
  page?: unknown;
  tenant?: Partial<HeaderTenantContract>;
  user?: Partial<HeaderUserContract>;
  actions?: unknown[];
  tenantId?: number | string;
  showBackButton?: boolean;
  searchQuery?: string;
  isEditMode?: boolean;
  isPageTitleEditable?: boolean;
  pageTitleDraft?: string;
  titlePlaceholder?: string;
  notificationUnreadCount?: number;
  notificationItems?: unknown[];
  onReadNotification?: ((notificationId: string | number) => void) | undefined;
  avatarSettings?: Record<string, unknown>;
  canSearch?: boolean;
  canEditPage?: boolean;
  canEditTitle?: boolean;
  canViewNotifications?: boolean;
  canOpenSettings?: boolean;
  onSearchChangeKey?: string;
  onSearchClearKey?: string;
  onEnterEditModeKey?: string;
  onExitEditModeKey?: string;
  onSavePageKey?: string;
  onOpenSettingsKey?: string;
  onEditTitleKey?: string;
  onSaveTitleKey?: string;
  onCancelTitleKey?: string;
  onBackKey?: string;
  meta?: Record<string, unknown>;
};

export type DesignerHeaderAdapterInput = {
  tenantId?: number | string;
  user?: Partial<HeaderUserContract>;
  title?: string;
  subtitle?: string;
  breadcrumbs?: unknown[];
  pathChain?: unknown[];
  pathname?: string;
  showBackButton?: boolean;
  searchQuery?: string;
  notificationUnreadCount?: number;
  notificationItems?: unknown[];
  onReadNotification?: ((notificationId: string | number) => void) | undefined;
  avatarSettings?: Record<string, unknown>;
  canSearch?: boolean;
  canViewNotifications?: boolean;
  canEditPage?: boolean;
  canOpenSettings?: boolean;
  isEditMode?: boolean;
  meta?: Record<string, unknown>;
};

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as UnknownRecord;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function mergeUser(
  user?: Partial<HeaderUserContract>
): HeaderUserContract | undefined {
  if (!user) {
    return undefined;
  }

  const id = asString(user.id);
  const name =
    asString(user.name) ??
    asString((user as UnknownRecord).full_name) ??
    asString((user as UnknownRecord).fullName);
  const email = asString(user.email);
  const avatarUrl =
    asString(user.avatarUrl) ?? asString((user as UnknownRecord).avatar_url);

  if (!id && !name && !email && !avatarUrl) {
    return undefined;
  }

  return { id, name, email, avatarUrl };
}

function resolveTitleFromPage(page: unknown): string | undefined {
  const record = asRecord(page);

  if (!record) {
    return undefined;
  }

  return (
    asString(record.title) ??
    asString(record.name) ??
    asString(record.label)
  );
}

function resolveTitleFromPortal(portal: unknown): string | undefined {
  const record = asRecord(portal);

  if (!record) {
    return undefined;
  }

  return (
    asString(record.title) ??
    asString(record.name) ??
    asString(record.label)
  );
}

function resolveRuntimeTitle(input: RuntimeHeaderAdapterInput): string | undefined {
  return (
    asString(input.title) ??
    resolveTitleFromPage(input.page) ??
    resolveTitleFromPage(
      asRecord(input.page)?.page ?? asRecord(asRecord(input.meta)?.pageData)?.page
    ) ??
    resolveTitleFromPortal(input.portal) ??
    undefined
  );
}

export function normalizePathChain(input: {
  pathChain?: unknown[];
  title?: string;
  breadcrumbs?: unknown[];
}): HeaderPathChainItem[] {
  const fromPathChain = Array.isArray(input.pathChain)
    ? input.pathChain
        .map((entry, index) => {
          const record = asRecord(entry);
          if (!record) return null;
          const label = asString(record.label) ?? asString(record.title);
          if (!label) return null;
          return {
            id: asString(record.id) ?? `path-${index}`,
            label,
            path: asString(record.path) ?? asString(record.to) ?? asString(record.href),
            active: asBoolean(record.active),
            meta: asRecord(record.meta) ?? undefined,
          };
        })
        .filter((entry): entry is HeaderPathChainItem => Boolean(entry))
    : [];

  const fallback = (() => {
    const title = asString(input.title);
    const breadcrumbs = mapBreadcrumbs(
      Array.isArray(input.breadcrumbs) ? input.breadcrumbs : []
    );
    const chain: HeaderPathChainItem[] = [];
    if (title) {
      chain.push({ id: "title", label: title });
    }
    breadcrumbs.forEach((crumb, index) => {
      chain.push({
        id: crumb.id || `breadcrumb-${index}`,
        label: crumb.label,
        path: crumb.path,
      });
    });
    return chain;
  })();

  const source = fromPathChain.length > 0 ? fromPathChain : fallback;
  if (source.length === 0) {
    return [];
  }

  const deduped: HeaderPathChainItem[] = [];
  source.forEach((item, index) => {
    const label = String(item.label || "").trim();
    if (!label) return;
    const prev = deduped[deduped.length - 1];
    const normalizedPath = asString(item.path);
    const prevPath = asString(prev?.path);
    if (
      prev &&
      prev.label.trim().toLowerCase() === label.toLowerCase() &&
      (prevPath ?? "") === (normalizedPath ?? "")
    ) {
      return;
    }
    deduped.push({
      ...item,
      id: item.id || `chain-${index}`,
      label,
      path: normalizedPath,
    });
  });

  return deduped.map((item, index, list) => ({
    ...item,
    active: index === list.length - 1 ? true : Boolean(item.active),
    path: index === list.length - 1 ? undefined : item.path,
  }));
}

function resolveRuntimeTenant(
  input: RuntimeHeaderAdapterInput
): HeaderTenantContract | undefined {
  if (input.tenant) {
    const id = asString(input.tenant.id) ?? asString(input.tenantId);
    const name = asString(input.tenant.name);
    const label =
      asString(input.tenant.label) ??
      name ??
      (id ? `Portal ${id}` : undefined);

    if (id || name || label) {
      return { id, name, label };
    }
  }

  const portalRecord = asRecord(input.portal);
  const portalId =
    asString(input.tenantId) ??
    asString(portalRecord?.id) ??
    asString(portalRecord?.portal_id);

  if (!portalId && !portalRecord) {
    return undefined;
  }

  const portalName =
    asString(portalRecord?.title) ??
    asString(portalRecord?.name) ??
    asString(portalRecord?.label);

  return {
    id: portalId,
    name: portalName,
    label: portalName ?? (portalId ? `Portal ${portalId}` : undefined),
  };
}

function mapBreadcrumbs(raw: unknown[] | undefined): HeaderBreadcrumbContract[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry, index) => {
      const record = asRecord(entry);

      if (!record) {
        return null;
      }

      const label =
        asString(record.label) ??
        asString(record.title) ??
        asString(record.name);

      if (!label) {
        return null;
      }

      const id = asString(record.id) ?? `breadcrumb-${index}`;

      return {
        id,
        label,
        path: asString(record.path) ?? asString(record.href),
      };
    })
    .filter((item): item is HeaderBreadcrumbContract => item !== null);
}

function mapUnknownActions(raw: unknown[] | undefined): HeaderActionContract[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry, index) => {
      const record = asRecord(entry);

      if (!record) {
        return null;
      }

      const id = asString(record.id) ?? `action-${index}`;
      const kindRaw = asString(record.kind);
      const kind =
        kindRaw === "button" ||
        kindRaw === "link" ||
        kindRaw === "menu" ||
        kindRaw === "switch" ||
        kindRaw === "custom"
          ? kindRaw
          : "button";

      return {
        id,
        kind,
        label: asString(record.label) ?? asString(record.title),
        icon: asString(record.icon),
        path: asString(record.path) ?? asString(record.href),
        active: asBoolean(record.active),
        disabled: asBoolean(record.disabled),
        actionKey:
          asString(record.actionKey) ??
          asString(record.onClickKey) ??
          asString(record.key),
        onClickKey:
          asString(record.onClickKey) ??
          asString(record.actionKey) ??
          asString(record.key),
        shortcut: asString(record.shortcut),
        variant:
          asString(record.variant) === "primary" ||
          asString(record.variant) === "ghost" ||
          asString(record.variant) === "danger" ||
          asString(record.variant) === "success" ||
          asString(record.variant) === "default"
            ? (asString(record.variant) as
                | "default"
                | "primary"
                | "ghost"
                | "danger"
                | "success")
            : undefined,
        tooltip: asString(record.tooltip),
        hidden: asBoolean(record.hidden),
        loading: asBoolean(record.loading),
        badgeCount: asNumber(record.badgeCount),
        meta: asRecord(record.meta) ?? undefined,
      };
    })
    .filter((item): item is HeaderActionContract => item !== null);
}

function resolveRuntimeCapabilities(
  input: RuntimeHeaderAdapterInput
): HeaderCapabilitiesContract {
  return {
    canSearch: input.canSearch ?? true,
    canEditPage: input.canEditPage ?? true,
    canEditTitle: input.canEditTitle ?? Boolean(input.isPageTitleEditable),
    canViewNotifications: input.canViewNotifications ?? true,
    canOpenSettings: input.canOpenSettings ?? true,
  };
}

function buildRuntimeLeftActions(
  input: RuntimeHeaderAdapterInput
): HeaderActionContract[] {
  const canGoBack = (input.meta as UnknownRecord | undefined)?.canGoBack;

  return [
    {
      id: "runtime-back",
      kind: "button",
      actionKey: input.onBackKey ?? "back",
      onClickKey: input.onBackKey ?? "back",
      tooltip: "Назад",
      variant: "ghost",
      disabled: canGoBack === false,
      meta: { display: "arrow-only" },
    },
  ];
}

function buildRuntimeModeActions(
  input: RuntimeHeaderAdapterInput
): HeaderActionContract[] {
  return [
    {
      id: "app-mode-switch",
      kind: "switch",
      label: "Режим работы",
      actionKey: "app-mode-switch",
      onClickKey: "app-mode-switch",
      variant: "ghost",
      meta: {
        tenantId: input.tenantId,
        variant: "runtime",
      },
    },
  ];
}

function buildRuntimeRightActions(
  input: RuntimeHeaderAdapterInput
): HeaderActionContract[] {
  const editAction: HeaderActionContract = {
    id: "page-edit-mode",
    kind: "button",
    label: input.isEditMode
      ? "Выйти из режима редактирования"
      : "Режим редактирования страницы",
    actionKey: input.isEditMode
      ? input.onExitEditModeKey ?? "exit-edit-mode"
      : input.onEnterEditModeKey ?? "enter-edit-mode",
    onClickKey: input.isEditMode
      ? input.onExitEditModeKey ?? "exit-edit-mode"
      : input.onEnterEditModeKey ?? "enter-edit-mode",
    active: input.isEditMode,
    variant: input.isEditMode ? "success" : "default",
    tooltip: input.isEditMode
      ? "Выйти из режима редактирования"
      : "Режим редактирования страницы",
    meta: {
      iconKey: input.isEditMode ? "save" : "settings",
      saveActionKey: input.onSavePageKey ?? "save-page",
    },
  };

  return [
    {
      id: "global-search",
      kind: "custom",
      label: "Поиск по системе",
      actionKey: input.onSearchChangeKey ?? "search-change",
      onClickKey: input.onSearchChangeKey ?? "search-change",
      variant: "default",
      hidden: input.canSearch === false,
      meta: {
        placeholder: "Поиск по системе...",
        value: input.searchQuery ?? "",
        clearActionKey: input.onSearchClearKey ?? "search-clear",
      },
    },
    {
      id: "notifications",
      kind: "button",
      label: "Уведомления",
      actionKey: "notifications",
      onClickKey: "notifications",
      badgeCount: input.notificationUnreadCount,
      hidden: input.canViewNotifications === false,
      tooltip: "Уведомления",
    },
    {
      id: "profile",
      kind: "button",
      label: "Личный кабинет",
      actionKey: "profile",
      onClickKey: "profile",
      tooltip: "Личный кабинет",
    },
    editAction,
  ];
}

function buildRuntimePageActions(
  input: RuntimeHeaderAdapterInput
): HeaderActionContract[] {
  return [
    {
      id: "save-page",
      kind: "button",
      label: "Сохранить страницу",
      actionKey: input.onSavePageKey ?? "save-page",
      onClickKey: input.onSavePageKey ?? "save-page",
      hidden: !input.isEditMode,
      variant: "success",
      tooltip: "Сохранить изменения страницы",
    },
    {
      id: "open-page-settings",
      kind: "iconButton",
      label: "Настройки страницы",
      icon: "settings",
      actionKey: input.onOpenSettingsKey ?? "open-page-settings",
      onClickKey: input.onOpenSettingsKey ?? "open-page-settings",
      hidden: input.canOpenSettings === false,
      variant: "ghost",
      tooltip: "Настройки страницы",
    },
  ];
}

function buildRuntimeEditableTitle(
  input: RuntimeHeaderAdapterInput,
  title?: string
): HeaderEditableTitleContract {
  return {
    enabled: true,
    value: title,
    draftValue: input.pageTitleDraft ?? title,
    placeholder: input.titlePlaceholder ?? "Название страницы",
    isEditing: Boolean(input.isPageTitleEditable),
    saveActionKey: input.onSaveTitleKey ?? "save-title",
    cancelActionKey: input.onCancelTitleKey ?? "cancel-title-edit",
    editActionKey: input.onEditTitleKey ?? "edit-title",
  };
}

function buildRuntimeSearch(
  input: RuntimeHeaderAdapterInput,
  capabilities: HeaderCapabilitiesContract
): HeaderSearchContract {
  const enabled = capabilities.canSearch !== false;

  return {
    enabled,
    value: input.searchQuery ?? "",
    placeholder: "Поиск по системе...",
    actionKey: "search",
    changeActionKey: input.onSearchChangeKey ?? "search-change",
    clearActionKey: input.onSearchClearKey ?? "search-clear",
  };
}

function buildRuntimeNotifications(
  input: RuntimeHeaderAdapterInput,
  capabilities: HeaderCapabilitiesContract
): HeaderNotificationContract {
  return {
    enabled: capabilities.canViewNotifications !== false,
    unreadCount: input.notificationUnreadCount,
    actionKey: "notifications",
    meta: {
      source: "NotificationBell",
      notificationItems: Array.isArray(input.notificationItems)
        ? input.notificationItems
        : [],
      onReadNotification:
        typeof input.onReadNotification === "function"
          ? input.onReadNotification
          : undefined,
    },
  };
}

function buildRuntimeEditMode(
  input: RuntimeHeaderAdapterInput,
  capabilities: HeaderCapabilitiesContract
): HeaderEditModeContract {
  return {
    enabled: capabilities.canEditPage !== false,
    active: Boolean(input.isEditMode),
    enterActionKey: input.onEnterEditModeKey ?? "enter-edit-mode",
    exitActionKey: input.onExitEditModeKey ?? "exit-edit-mode",
    saveActionKey: input.onSavePageKey ?? "save-page",
    settingsActionKey: input.onOpenSettingsKey ?? "open-page-settings",
  };
}

function isDesignerCustomPageRoute(pathname?: string): boolean {
  if (!pathname) {
    return false;
  }

  return /\/designer\/tenant\/[^/]+\/page\/\d+/.test(pathname);
}

function resolveDesignerTitle(pathname?: string, explicitTitle?: string): string {
  if (explicitTitle) {
    return explicitTitle;
  }

  if (!pathname) {
    return "Студия";
  }

  if (pathname.includes("/object-types")) {
    return "Объекты";
  }
  if (pathname.includes("/relations")) {
    return "Связи";
  }
  if (pathname.includes("/views")) {
    return "Представления";
  }
  if (pathname.includes("/users")) {
    return "Пользователи";
  }
  if (pathname.includes("/settings")) {
    return "Системные настройки";
  }

  return "Студия";
}

function buildDesignerBreadcrumbs(
  pathname?: string,
  tenantId?: string | number
): HeaderBreadcrumbContract[] {
  if (!pathname || !pathname.startsWith("/designer/")) {
    return [];
  }

  const normalizedTenantId = String(tenantId ?? "1");
  const base = `/designer/tenant/${normalizedTenantId}`;
  const items: HeaderBreadcrumbContract[] = [];

  if (pathname.includes("/object-types")) {
    items.push({ id: "designer-objects", label: "Объекты", path: `${base}/object-types` });
    const objectMatch = pathname.match(/\/object-types\/([^/]+)/);
    if (objectMatch) {
      items.push({
        id: "designer-object-current",
        label: "Объект",
      });

      const tabMatch = pathname.match(/\/object-types\/[^/]+\/([^/]+)/);
      if (tabMatch) {
        items.push({
          id: "designer-object-tab",
          label: resolveDesignerTabLabel(tabMatch[1]),
        });
      }
    }
    return items;
  }

  if (pathname.includes("/page/")) {
    items.push({ id: "designer-objects", label: "Объекты", path: `${base}/object-types` });
    items.push({ id: "designer-page", label: "Страница" });
    return items;
  }

  if (pathname.includes("/relations")) {
    items.push({ id: "designer-relations", label: "Связи", path: `${base}/relations` });
    return items;
  }

  if (pathname.includes("/views")) {
    items.push({ id: "designer-views", label: "Представления", path: `${base}/views` });
    return items;
  }

  if (pathname.includes("/users")) {
    items.push({ id: "designer-users", label: "Пользователи", path: `${base}/users` });
    return items;
  }

  if (pathname.includes("/settings")) {
    items.push({ id: "designer-settings", label: "Системные настройки", path: `${base}/settings` });
    return items;
  }

  return [{ id: "designer-root", label: "Студия", path: base }];
}

function resolveDesignerTabLabel(tabSegment: string): string {
  const segment = String(tabSegment || "").toLowerCase();
  if (segment === "general") return "Общие";
  if (segment === "fields") return "Поля";
  if (segment === "relations") return "Связи";
  if (segment === "views") return "Представления";
  return "Раздел";
}

function buildDesignerModeActions(
  input: DesignerHeaderAdapterInput
): HeaderActionContract[] {
  return [
    {
      id: "app-mode-switch",
      kind: "switch",
      label: "Режим работы",
      actionKey: "app-mode-switch",
      onClickKey: "app-mode-switch",
      meta: {
        tenantId: input.tenantId,
        variant: "designer",
      },
    },
  ];
}

function buildDesignerLeftActions(
  input: DesignerHeaderAdapterInput
): HeaderActionContract[] {
  const canGoBack = (input.meta as UnknownRecord | undefined)?.canGoBack;

  return [
    {
      id: "designer-back",
      kind: "button",
      actionKey: "back",
      onClickKey: "back",
      tooltip: "Назад",
      variant: "ghost",
      disabled: canGoBack === false,
      meta: { display: "arrow-only" },
    },
  ];
}

function resolveDesignerCapabilities(
  input: DesignerHeaderAdapterInput
): HeaderCapabilitiesContract {
  const isCustomPage = isDesignerCustomPageRoute(input.pathname);

  return {
    canSearch: input.canSearch ?? false,
    canEditPage: input.canEditPage ?? isCustomPage,
    canEditTitle: false,
    canViewNotifications: input.canViewNotifications ?? true,
    canOpenSettings: input.canOpenSettings ?? isCustomPage,
  };
}

function toDesignerRuntimeLikeInput(
  input: DesignerHeaderAdapterInput,
  title: string,
  subtitle: string
): RuntimeHeaderAdapterInput {
  return {
    pathname: input.pathname,
    title,
    subtitle,
    tenantId: input.tenantId,
    user: input.user,
    searchQuery: input.searchQuery ?? "",
    notificationUnreadCount: input.notificationUnreadCount,
    notificationItems: input.notificationItems,
    onReadNotification: input.onReadNotification,
    avatarSettings: input.avatarSettings,
    isEditMode: input.isEditMode ?? false,
    meta: input.meta,
  };
}

/**
 * Maps Runtime WorkspaceTopBar data into AppHeaderContract.
 */
export function createRuntimeHeaderContract(
  input: RuntimeHeaderAdapterInput
): AppHeaderContract {
  const title = resolveRuntimeTitle(input);
  const breadcrumbs = mapBreadcrumbs(input.breadcrumbs);
  const pathChain = normalizePathChain({
    pathChain: input.pathChain,
    title,
    breadcrumbs,
  });
  const extraActions = mapUnknownActions(input.actions);
  const capabilities = resolveRuntimeCapabilities(input);
  const search = buildRuntimeSearch(input, capabilities);
  const notifications = buildRuntimeNotifications(input, capabilities);
  const editMode = buildRuntimeEditMode(input, capabilities);
  const pageActions = buildRuntimePageActions(input);

  return {
    mode:
      typeof input.pathname === "string" &&
      input.pathname.startsWith("/designer")
        ? HEADER_MODES.DESIGNER
        : HEADER_MODES.RUNTIME,
    title,
    subtitle: undefined,
    breadcrumbs: undefined,
    pathChain,
    leftActions: buildRuntimeLeftActions(input),
    modeActions: buildRuntimeModeActions(input),
    rightActions: [...buildRuntimeRightActions(input), ...extraActions],
    pageActions,
    editableTitle: buildRuntimeEditableTitle(input, title),
    search,
    notifications,
    editMode,
    capabilities,
    tenant: resolveRuntimeTenant(input),
    user: mergeUser(input.user),
    meta: {
      source: "WorkspaceTopBar",
      pathname: input.pathname,
      tenantId: input.tenantId,
      searchQuery: input.searchQuery,
      isEditMode: input.isEditMode,
      isPageTitleEditable: input.isPageTitleEditable,
      pageTitleDraft: input.pageTitleDraft,
      titlePlaceholder: input.titlePlaceholder,
      notificationUnreadCount: input.notificationUnreadCount,
      avatarSettings: input.avatarSettings,
      hasBreadcrumbs: breadcrumbs.length > 0,
      titleSource: title
        ? input.title
          ? "input.title"
          : resolveTitleFromPage(input.page)
            ? "page"
            : "portal"
        : "fallback-empty",
      ...input.meta,
    },
  };
}

/**
 * Maps Designer DesignerHeader data into AppHeaderContract.
 */
export function createDesignerHeaderContract(
  input: DesignerHeaderAdapterInput
): AppHeaderContract {
  const tenantId = asString(input.tenantId);
  const title = resolveDesignerTitle(input.pathname, asString(input.title));
  const subtitle = asString(input.subtitle) ?? "Студия";
  const capabilities = resolveDesignerCapabilities(input);
  const runtimeLikeInput = toDesignerRuntimeLikeInput(input, title, subtitle);
  const breadcrumbs = mapBreadcrumbs(input.breadcrumbs);
  const resolvedBreadcrumbs =
    breadcrumbs.length > 0
      ? breadcrumbs
      : buildDesignerBreadcrumbs(input.pathname, input.tenantId);
  const pathChain = normalizePathChain({
    pathChain: input.pathChain,
    title,
    breadcrumbs: resolvedBreadcrumbs,
  });
  const search = buildRuntimeSearch(runtimeLikeInput, capabilities);
  const notifications = {
    ...buildRuntimeNotifications(runtimeLikeInput, capabilities),
    enabled: capabilities.canViewNotifications !== false,
  };
  const editMode = buildRuntimeEditMode(runtimeLikeInput, capabilities);

  return {
    mode: HEADER_MODES.DESIGNER,
    title,
    subtitle: undefined,
    breadcrumbs: undefined,
    pathChain,
    leftActions: buildDesignerLeftActions(input),
    modeActions: buildDesignerModeActions(input),
    search: {
      ...search,
      enabled: capabilities.canSearch === true,
    },
    notifications,
    editMode,
    capabilities,
    tenant: tenantId
      ? {
          id: tenantId,
          label: `Tenant ${tenantId}`,
        }
      : undefined,
    user: mergeUser(input.user),
    meta: {
      source: "DesignerShell",
      pathname: input.pathname,
      tenantId: input.tenantId,
      titleSource: input.title ? "input.title" : "pathname",
      avatarSettings: input.avatarSettings,
      notificationUnreadCount: input.notificationUnreadCount,
      isDesignerCustomPage: isDesignerCustomPageRoute(input.pathname),
      ...input.meta,
    },
  };
}
