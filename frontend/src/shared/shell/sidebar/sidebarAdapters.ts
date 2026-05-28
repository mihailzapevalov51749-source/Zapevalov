import type {
  AppSidebarContract,
  SidebarBrandContract,
  SidebarCapabilitiesContract,
} from "./sidebarContracts";
import { SIDEBAR_MODES } from "./sidebarMode";
import type { SidebarActionContract, SidebarItemContract } from "./sidebarTypes";

type UnknownRecord = Record<string, unknown>;
type RuntimeMappingContext = {
  activePath?: string;
  activePageId?: string;
  parentId?: string;
  level: number;
  isEditMode: boolean;
  capabilities: SidebarCapabilitiesContract;
};

export type RuntimeSidebarAdapterInput = {
  navigationItems?: unknown[];
  reloadNavigation?: () => void | Promise<void>;
  activePath?: string;
  activePageId?: string | number;
  isEditMode?: boolean;
  isSaving?: boolean;
  onChangeMenuScale?: (value: number) => void;
  menuScale?: number;
  canEditMenu?: boolean;
  canCreateItem?: boolean;
  canOpenSettings?: boolean;
  canDragItems?: boolean;
  canScaleMenu?: boolean;
  onSelectPageKey?: string;
  onAddItemKey?: string;
  onOpenSettingsKey?: string;
  onToggleEditModeKey?: string;
  onDragEndKey?: string;
  brand?: Partial<SidebarBrandContract>;
};

export type DesignerSidebarAdapterInput = {
  navigationItems?: unknown[];
  reloadNavigation?: () => void | Promise<void>;
  sourceMode?: "persisted-designer" | "fallback-designer" | string;
  activePath?: string;
  activePageId?: string | number;
  tenantId?: string | number;
  activeKey?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isEditMode?: boolean;
  menuScale?: number;
  canEditMenu?: boolean;
  canCreateItem?: boolean;
  canOpenSettings?: boolean;
  canDragItems?: boolean;
  canScaleMenu?: boolean;
  onAddItemKey?: string;
  onOpenSettingsKey?: string;
  onToggleEditModeKey?: string;
  onChangeMenuScale?: (value: number) => void;
  brand?: Partial<SidebarBrandContract>;
};

const RUNTIME_BRAND_DEFAULTS: SidebarBrandContract = {
  title: "YasnoPro",
  subtitle: "Система управления",
};

const DESIGNER_BRAND_DEFAULTS: SidebarBrandContract = {
  title: "YasnoPro",
  subtitle: "Режим аналитика",
};

const DESIGNER_FALLBACK_MENU = [
  { id: "objects", label: "Объекты", iconType: "objects" },
  { id: "relations", label: "Связи", iconType: "relations" },
  { id: "views", label: "Представления", iconType: "views" },
  { id: "users", label: "Пользователи", iconType: "users" },
  { id: "settings", label: "Системные настройки", iconType: "settings" },
];


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

function mergeBrand(
  defaults: SidebarBrandContract,
  overrides?: Partial<SidebarBrandContract>
): SidebarBrandContract {
  return {
    title: overrides?.title ?? defaults.title,
    subtitle: overrides?.subtitle ?? defaults.subtitle,
    logoSrc: overrides?.logoSrc,
    logoAlt: overrides?.logoAlt ?? defaults.logoAlt,
  };
}

function resolveRuntimeCapabilities(
  input: RuntimeSidebarAdapterInput
): SidebarCapabilitiesContract {
  const canEditMenu = input.canEditMenu ?? true;
  const canCreateItem = input.canCreateItem ?? canEditMenu;
  const canOpenSettings = input.canOpenSettings ?? true;
  const canDragItems =
    input.canDragItems ??
    Boolean(
      input.isEditMode && hasPersistableNavigationItems(input.navigationItems)
    );
  const canScaleMenu = input.canScaleMenu ?? Boolean(input.isEditMode);

  return {
    canEditMenu,
    canCreateItem,
    canOpenSettings,
    canDragItems,
    canScaleMenu,
  };
}

function resolveDesignerCapabilities(
  input: DesignerSidebarAdapterInput
): SidebarCapabilitiesContract {
  const isPersistedDesigner = input.sourceMode === "persisted-designer";
  const canEditMenu = input.canEditMenu ?? true;
  const canCreateItem = input.canCreateItem ?? canEditMenu;
  const canOpenSettings = input.canOpenSettings ?? true;
  const canDragItems =
    input.canDragItems ??
    Boolean(input.isEditMode && isPersistedDesigner);
  const canScaleMenu = input.canScaleMenu ?? Boolean(input.isEditMode);

  return {
    canEditMenu,
    canCreateItem,
    canOpenSettings,
    canDragItems,
    canScaleMenu,
  };
}

function buildDesignerFallbackNavigationItems(
  tenantId?: string | number
): unknown[] {
  const normalizedTenantId = String(tenantId ?? "1");
  const routeById: Record<string, string> = {
    objects: `/designer/tenant/${normalizedTenantId}/object-types`,
    relations: `/designer/tenant/${normalizedTenantId}/relations`,
    views: `/designer/tenant/${normalizedTenantId}/views`,
    users: `/designer/tenant/${normalizedTenantId}/users`,
    settings: `/designer/tenant/${normalizedTenantId}/settings`,
  };

  return [
    {
      id: "designer-fallback-navigation",
      title: "Навигация",
      type: "section",
      is_visible: true,
      children: DESIGNER_FALLBACK_MENU.map((item, index) => ({
        id: `system-designer-fallback-${item.id}`,
        title: item.label,
        type: "system_page",
        route: routeById[item.id],
        icon_type: item.iconType,
        icon: item.iconType,
        is_visible: true,
        sort_order: index,
      })),
    },
  ];
}

function collectDesignerFallbackRoutes(tenantId?: string | number): Set<string> {
  const fallbackItems = buildDesignerFallbackNavigationItems(tenantId);
  const routes = new Set<string>();

  const walk = (items: unknown[]) => {
    items.forEach((rawItem) => {
      const item = asRecord(rawItem);
      if (!item) return;

      const route = asString(item.route) ?? asString(item.path) ?? asString(item.url);
      if (route) {
        routes.add(route);
      }

      const children = item.children ?? item.items;
      if (Array.isArray(children)) {
        walk(children);
      }
    });
  };

  walk(fallbackItems);
  return routes;
}

function filterDesignerPersistedCustomItems(
  items: unknown[] | undefined,
  fallbackRoutes: Set<string>,
  tenantId?: string | number
): unknown[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const normalize = (rawItem: unknown): unknown | null => {
    const item = asRecord(rawItem);
    if (!item) {
      return null;
    }

    const id = asString(item.id) ?? "";
    if (id.startsWith("system-designer-fallback-")) {
      return null;
    }

    const route = asString(item.route) ?? asString(item.path) ?? asString(item.url);
    if (route && fallbackRoutes.has(route)) {
      return null;
    }

    const pageId = item.page_id ?? item.pageId;
    const normalizedTenantId = String(tenantId ?? "1");
    const itemScope =
      asString(item.menu_scope) ??
      asString(item.scope) ??
      asString(item.mode) ??
      asString(item.context);
    const inferredPath =
      route ??
      (typeof pageId === "number" && Number.isFinite(pageId)
        ? itemScope === "runtime"
          ? `/portal/${normalizedTenantId}/page/${pageId}`
          : `/designer/tenant/${normalizedTenantId}/page/${pageId}`
        : undefined);

    const normalizedItem: UnknownRecord = {
      ...item,
      ...(inferredPath ? { path: inferredPath, route: inferredPath } : {}),
    };

    const childrenSource = normalizedItem.children ?? normalizedItem.items;
    if (!Array.isArray(childrenSource)) {
      return normalizedItem;
    }

    const filteredChildren = childrenSource
      .map((child) => normalize(child))
      .filter((child): child is UnknownRecord => Boolean(child));

    if (filteredChildren.length === 0) {
      if (asString(item.type) === "section" || asString(item.type) === "workspace") {
        return null;
      }

      return {
        ...normalizedItem,
        children: [],
      };
    }

    return {
      ...normalizedItem,
      children: filteredChildren,
    };
  };

  return items
    .map((item) => normalize(item))
    .filter((item): item is UnknownRecord => Boolean(item));
}

function resolveDesignerSortOrder(item: UnknownRecord): number {
  const order = item.sort_order ?? item.sortOrder;

  if (typeof order === "number" && Number.isFinite(order)) {
    return order;
  }

  if (typeof order === "string") {
    const parsed = Number(order);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const id = asString(item.id);
  const idNumber = id ? Number(id) : Number.NaN;
  return Number.isFinite(idNumber) ? idNumber : 0;
}

function isDesignerSystemNavigationItem(item: UnknownRecord): boolean {
  if (item.is_system === true || item.isSystem === true) {
    return true;
  }

  const systemKey = asString(item.system_key) ?? asString(item.systemKey);
  return Boolean(systemKey);
}

function sortDesignerNavigationItems(items: UnknownRecord[]): UnknownRecord[] {
  return [...items].sort((left, right) => {
    const orderDiff = resolveDesignerSortOrder(left) - resolveDesignerSortOrder(right);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    const leftId = asString(left.id) ?? "";
    const rightId = asString(right.id) ?? "";
    return leftId.localeCompare(rightId);
  });
}

function mergeDesignerNavigationItems(items: unknown[]): unknown[] {
  const systemItems: UnknownRecord[] = [];
  const customItems: UnknownRecord[] = [];

  items.forEach((rawItem) => {
    const item = asRecord(rawItem);
    if (!item) {
      return;
    }

    if (isDesignerSystemNavigationItem(item)) {
      systemItems.push(item);
      return;
    }

    customItems.push(item);
  });

  return [
    ...sortDesignerNavigationItems(systemItems),
    ...sortDesignerNavigationItems(customItems),
  ];
}

function hasPersistableNavigationItems(items: unknown[] | undefined): boolean {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some((item) => isPersistableNavigationItem(item));
}

function isPersistableNavigationItem(rawItem: unknown): boolean {
  const item = asRecord(rawItem);
  if (!item) {
    return false;
  }

  const id = asString(item.id) ?? "";
  const type = asString(item.type) ?? "";
  const isSystem = type === "system_page" || id.startsWith("system-");
  const hasBackendKey =
    typeof item.sort_order === "number" ||
    item.page_id != null ||
    (id.length > 0 && !id.startsWith("designer-"));

  if (!isSystem && hasBackendKey) {
    return true;
  }

  const childrenSource = item.children ?? item.items;
  if (!Array.isArray(childrenSource)) {
    return false;
  }

  return childrenSource.some((child) => isPersistableNavigationItem(child));
}

function resolveRuntimeItemLabel(item: UnknownRecord): string {
  return (
    asString(item.title) ??
    asString(item.label) ??
    asString(item.name) ??
    "Без названия"
  );
}

function resolveRuntimeItemId(item: UnknownRecord, label: string): string {
  return (
    asString(item.id) ??
    asString(item.key) ??
    asString(item.path) ??
    label
  );
}

function resolveRuntimeItemPath(item: UnknownRecord): string | undefined {
  return (
    asString(item.path) ??
    asString(item.url) ??
    asString(item.route) ??
    undefined
  );
}

function resolveRuntimePageId(item: UnknownRecord): string | number | undefined {
  const pageId = item.page_id ?? item.pageId;

  if (typeof pageId === "number" && Number.isFinite(pageId)) {
    return pageId;
  }

  const pageIdString = asString(pageId);
  if (!pageIdString) {
    return undefined;
  }

  const pageIdNumber = Number(pageIdString);
  return Number.isFinite(pageIdNumber) ? pageIdNumber : pageIdString;
}

function resolveRuntimeIconType(item: UnknownRecord): string | undefined {
  return asString(item.icon_type) ?? asString(item.type) ?? asString(item.icon_name);
}

function resolveRuntimeIconFileUrl(item: UnknownRecord): string | undefined {
  return asString(item.icon_file_url);
}

function resolveRuntimeRouteKey(item: UnknownRecord): string | undefined {
  return asString(item.route) ?? resolveRuntimeItemPath(item);
}

function resolveRuntimeSystemKey(item: UnknownRecord, id: string): string | undefined {
  if (asString(item.type) === "system_page") {
    return asString(item.route) ?? id;
  }

  if (id.startsWith("system-")) {
    return id;
  }

  return asString(item.system_key);
}

function isRuntimeSystemItem(item: UnknownRecord, id: string): boolean {
  return (
    asBoolean(item.isSystem) ||
    id.startsWith("system-") ||
    asString(item.type) === "system_page"
  );
}

function isRuntimeItemHidden(item: UnknownRecord): boolean {
  if (asBoolean(item.is_hidden)) {
    return true;
  }

  if (item.is_visible === false) {
    return true;
  }

  return false;
}

function isRuntimeItemExpanded(item: UnknownRecord): boolean | undefined {
  if (typeof item.is_expanded === "boolean") {
    return item.is_expanded;
  }

  if (typeof item.isExpanded === "boolean") {
    return item.isExpanded;
  }

  return undefined;
}

function shouldHideRuntimeAdministrationItem(item: UnknownRecord): boolean {
  const title = String(item.title ?? item.label ?? "").trim().toLowerCase();
  const route = String(item.route ?? item.path ?? item.url ?? "").trim().toLowerCase();
  const type = String(item.type ?? "").trim().toLowerCase();
  const systemKey = String(item.system_key ?? item.systemKey ?? "").trim().toLowerCase();
  const blockType = String(
    item.block_type ?? item.blockType ?? item.widget_type ?? item.widgetType ?? ""
  )
    .trim()
    .toLowerCase();

  if (title === "администрирование" || route.startsWith("/admin")) {
    return true;
  }

  if (
    title === "настройка системы" ||
    title === "настройки системы" ||
    title === "пользователи системы" ||
    title === "роли и доступы"
  ) {
    return true;
  }

  if (
    route.includes("/system-settings") ||
    route.includes("/settings/system") ||
    route.includes("/administration/system-settings") ||
    route.includes("/admin/system")
  ) {
    return true;
  }

  if (
    route.includes("/administration/users") ||
    route.includes("/administration/roles") ||
    route.includes("/administration/audit-log") ||
    route.includes("/administration/modules") ||
    route.includes("/administration/integrations") ||
    route.includes("/administration/ai-assistants")
  ) {
    return true;
  }

  if (
    title === "настройки страницы" &&
    (type === "system_page" ||
      systemKey.includes("admin") ||
      systemKey.includes("system") ||
      blockType === "admin_system")
  ) {
    return true;
  }

  return false;
}

function buildRuntimeItemMeta(
  item: UnknownRecord,
  iconType?: string,
  iconFileUrl?: string
): Record<string, unknown> {
  return {
    source: item,
    iconType,
    icon_type: item.icon_type,
    icon_file_url: item.icon_file_url,
    type: item.type,
    icon: item.icon,
    icon_name: item.icon_name,
    settings: item.settings,
    page_id: item.page_id,
    route: item.route,
  };
}

function resolveRuntimeActivePageId(
  value: string | number | null | undefined
): string | number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

function isRuntimeItemActive(
  item: UnknownRecord,
  itemId: string,
  pageId: string | number | undefined,
  activePath?: string,
  activePageId?: string | number
): boolean {
  const path = resolveRuntimeItemPath(item);

  if (activePath) {
    const normalize = (value: string | undefined) => {
      if (!value) return "";
      const trimmed = String(value).trim();
      if (!trimmed) return "";
      if (trimmed === "/") return "/";
      return trimmed.replace(/\/+$/, "");
    };
    const normalizedActivePath = normalize(activePath);
    const normalizedPath = normalize(path);
    if (normalizedPath && normalizedPath === normalizedActivePath) {
      return true;
    }
    if (itemId === normalizedActivePath) {
      return true;
    }

    const isDesignerPath =
      normalizedPath.startsWith("/designer/") &&
      normalizedActivePath.startsWith("/designer/");
    if (
      isDesignerPath &&
      normalizedPath &&
      (normalizedActivePath === normalizedPath ||
        normalizedActivePath.startsWith(`${normalizedPath}/`))
    ) {
      return true;
    }
  }

  if (activePageId === undefined || pageId === undefined) {
    return false;
  }

  return pageId === activePageId || String(pageId) === String(activePageId);
}

function mapRuntimeNavigationChildren(
  item: UnknownRecord,
  context: RuntimeMappingContext,
  parentId: string
): SidebarItemContract[] | undefined {
  const childrenSource = item.children ?? item.items;

  if (!Array.isArray(childrenSource)) {
    return undefined;
  }

  const children = childrenSource
    .map((child, index) =>
      mapRuntimeNavigationItem(
        child,
        {
          ...context,
          parentId,
          level: context.level + 1,
        },
        index
      )
    )
    .filter((child): child is SidebarItemContract => child !== null);

  return children.length > 0 ? children : undefined;
}

function mapRuntimeNavigationItem(
  rawItem: unknown,
  context: RuntimeMappingContext,
  order: number
): SidebarItemContract | null {
  const item = asRecord(rawItem);

  if (!item) {
    return null;
  }

  const label = resolveRuntimeItemLabel(item);
  if (shouldHideRuntimeAdministrationItem(item)) return null;
  const id = resolveRuntimeItemId(item, label);
  const path = resolveRuntimeItemPath(item);
  const pageId = resolveRuntimePageId(item);
  const iconType = resolveRuntimeIconType(item);
  const iconFileUrl = resolveRuntimeIconFileUrl(item);
  const routeKey = resolveRuntimeRouteKey(item);
  const systemKey = resolveRuntimeSystemKey(item, id);
  const isSystem = isRuntimeSystemItem(item, id);
  const isExpanded = isRuntimeItemExpanded(item);

  const mappedItem: SidebarItemContract = {
    id,
    kind: "item",
    label,
    icon: asString(item.icon) ?? iconType,
    path,
    active: isRuntimeItemActive(
      item,
      id,
      pageId,
      context.activePath,
      context.activePageId
    ),
    disabled: asBoolean(item.disabled),
    parentId: context.parentId,
    level: context.level,
    order,
    isSystem,
    isCustom: !isSystem,
    isHidden: isRuntimeItemHidden(item),
    isExpanded,
    isEditable: context.isEditMode && !isSystem,
    isDraggable:
      Boolean(context.capabilities.canDragItems) &&
      context.isEditMode &&
      !isSystem,
    isDroppable:
      Boolean(context.capabilities.canDragItems) &&
      context.isEditMode &&
      !isSystem,
    iconType,
    iconFileUrl,
    pageId,
    systemKey,
    actionKey: "select-menu-item",
    routeKey,
    meta: buildRuntimeItemMeta(item, iconType, iconFileUrl),
  };

  mappedItem.children = mapRuntimeNavigationChildren(item, context, id);

  const isSectionLike =
    asString(item.type) === "section" || asString(item.type) === "workspace";
  const hasChildren = Array.isArray(mappedItem.children) && mappedItem.children.length > 0;
  if (isSectionLike && !hasChildren && !path && pageId === undefined) {
    return null;
  }

  return mappedItem;
}

function mapRuntimeNavigationItems(
  navigationItems: unknown[] | undefined,
  activePath?: string,
  activePageId?: string,
  isEditMode = false,
  capabilities: SidebarCapabilitiesContract = {}
): SidebarItemContract[] {
  if (!Array.isArray(navigationItems)) {
    return [];
  }

  const context: RuntimeMappingContext = {
    activePath,
    activePageId,
    level: 0,
    isEditMode,
    capabilities,
  };

  return navigationItems
    .map((item, index) => mapRuntimeNavigationItem(item, context, index))
    .filter((item): item is SidebarItemContract => item !== null);
}

function stripRuntimeAdministrationItems(items: unknown[] | undefined): unknown[] {
  if (!Array.isArray(items)) return [];
  const normalize = (rawItem: unknown): unknown | null => {
    const item = asRecord(rawItem);
    if (!item) return null;
    if (shouldHideRuntimeAdministrationItem(item)) {
      return null;
    }
    const childrenSource = Array.isArray(item.children) ? item.children : [];
    const children = childrenSource
      .map((child) => normalize(child))
      .filter((child): child is UnknownRecord => Boolean(child));

    if (childrenSource.length > 0 && children.length === 0) {
      const itemType = String(item.type ?? "").trim().toLowerCase();
      const isSectionLike = itemType === "section" || itemType === "workspace";
      if (isSectionLike) {
        return null;
      }
    }

    return {
      ...item,
      ...(Array.isArray(item.children) ? { children } : {}),
    };
  };

  return items
    .map((item) => normalize(item))
    .filter((item): item is UnknownRecord => Boolean(item));
}

function findActiveItemId(items: SidebarItemContract[]): string | undefined {
  for (const item of items) {
    if (item.active) {
      return item.id;
    }

    if (Array.isArray(item.children) && item.children.length > 0) {
      const childActiveItemId = findActiveItemId(item.children);
      if (childActiveItemId) {
        return childActiveItemId;
      }
    }
  }

  return undefined;
}

function buildRuntimeActions(
  input: RuntimeSidebarAdapterInput,
  capabilities: SidebarCapabilitiesContract
): SidebarActionContract[] {
  const actions: SidebarActionContract[] = [];

  if (capabilities.canEditMenu) {
    actions.push({
      id: "edit-menu",
      label: input.isEditMode ? "Сохранить меню" : "Редактировать меню",
      kind: "button",
      icon: input.isEditMode ? "save" : "settings",
      actionKey: input.onToggleEditModeKey ?? "toggle-edit-mode",
    });
  }

  if (capabilities.canCreateItem) {
    actions.push({
      id: "add-item",
      label: "Добавить пункт",
      kind: "iconButton",
      icon: "plus",
      hidden: !input.isEditMode,
      actionKey: input.onAddItemKey ?? "add-menu-item",
    });
  }

  if (capabilities.canOpenSettings) {
    actions.push({
      id: "open-settings",
      label: "Настройки меню",
      kind: "iconButton",
      icon: "settings",
      actionKey: input.onOpenSettingsKey ?? "toggle-edit-mode",
    });
  }

  if (capabilities.canScaleMenu) {
    actions.push({
      id: "menu-scale",
      label: "Масштаб меню",
      kind: "menu",
      actionKey: "menu-scale",
      meta: {
        value: input.menuScale ?? 1,
        min: 0.8,
        max: 1.4,
        step: 0.1,
      },
    });
  }

  return actions;
}

/**
 * Maps Runtime navigation tree into AppSidebarContract.
 */
export function createRuntimeSidebarContract(
  input: RuntimeSidebarAdapterInput
): AppSidebarContract {
  const activePageId = resolveRuntimeActivePageId(input.activePageId);
  const capabilities = resolveRuntimeCapabilities(input);
  const navigationItems = stripRuntimeAdministrationItems(input.navigationItems);

  return {
    mode: SIDEBAR_MODES.RUNTIME,
    brand: mergeBrand(RUNTIME_BRAND_DEFAULTS, input.brand),
    sections: [
      {
        id: "runtime-navigation",
        items: [],
      },
    ],
    footerActions: [],
    editMode: Boolean(input.isEditMode),
    isSaving: Boolean(input.isSaving),
    menuScale: input.menuScale ?? 1,
    activePageId,
    actions: buildRuntimeActions(input, capabilities),
    capabilities,
    navigationItems,
    reloadNavigation: input.reloadNavigation,
    onChangeMenuScale: input.onChangeMenuScale,
  } as AppSidebarContract & {
    navigationItems: unknown[];
    reloadNavigation?: () => void | Promise<void>;
    isSaving?: boolean;
    onChangeMenuScale?: (value: number) => void;
  };
}

/**
 * Maps Designer navigation into the same runtime AppSidebarContract shape.
 */
export function createDesignerSidebarContract(
  input: DesignerSidebarAdapterInput
): AppSidebarContract {
  const activePageId = resolveRuntimeActivePageId(input.activePageId);
  const capabilities = resolveDesignerCapabilities(input);
  const fallbackRoutes = collectDesignerFallbackRoutes(input.tenantId);
  const persistedItems = filterDesignerPersistedCustomItems(
    input.navigationItems,
    new Set(),
    input.tenantId
  );
  const fallbackItems = buildDesignerFallbackNavigationItems(input.tenantId);
  const navigationItems =
    persistedItems.length > 0
      ? mergeDesignerNavigationItems(persistedItems)
      : filterDesignerPersistedCustomItems(fallbackItems, fallbackRoutes, input.tenantId);

  return {
    mode: SIDEBAR_MODES.RUNTIME,
    brand: mergeBrand(RUNTIME_BRAND_DEFAULTS, input.brand ?? {
      subtitle: DESIGNER_BRAND_DEFAULTS.subtitle,
    }),
    sections: [
      {
        id: "designer-navigation",
        items: [],
      },
    ],
    footerActions: [],
    editMode: Boolean(input.isEditMode),
    menuScale: input.menuScale ?? 1,
    activePageId,
    actions: buildRuntimeActions(
      {
        ...input,
        isEditMode: Boolean(input.isEditMode),
      },
      capabilities
    ),
    capabilities,
    navigationItems,
    reloadNavigation: input.reloadNavigation,
    onChangeMenuScale: input.onChangeMenuScale,
  } as AppSidebarContract & {
    navigationItems: unknown[];
    reloadNavigation?: () => void | Promise<void>;
  };
}
