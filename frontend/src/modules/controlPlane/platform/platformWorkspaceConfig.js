import { buildControlPlanePlatformPath } from "../config/controlPlanePaths.js";

export const PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG = "overview";

export const PLATFORM_WORKSPACE_TABS = [
  {
    id: "overview",
    slug: "overview",
    label: "Обзор",
    route: buildControlPlanePlatformPath("overview"),
    enabled: true,
  },
  {
    id: "environments",
    slug: "environments",
    label: "Среды",
    route: buildControlPlanePlatformPath("environments"),
    enabled: true,
  },
  {
    id: "modules",
    slug: "modules",
    label: "Модули платформы",
    route: buildControlPlanePlatformPath("modules"),
    enabled: true,
  },
  {
    id: "module-update-offers",
    slug: "module-update-offers",
    label: "Обновления модулей",
    route: buildControlPlanePlatformPath("module-update-offers"),
    enabled: true,
  },
  {
    id: "module-update-previews",
    slug: "module-update-previews",
    label: "Предпросмотр обновлений",
    route: buildControlPlanePlatformPath("module-update-previews"),
    enabled: true,
  },
  {
    id: "policies",
    slug: "policies",
    label: "Глобальные политики",
    route: buildControlPlanePlatformPath("policies"),
    enabled: true,
  },
  {
    id: "monitoring",
    slug: "monitoring",
    label: "Мониторинг",
    route: buildControlPlanePlatformPath("monitoring"),
    enabled: true,
  },
  {
    id: "tenant-module-configurations",
    slug: "tenant-module-configurations",
    label: "Tenant Module Configurations",
    route: buildControlPlanePlatformPath("tenant-module-configurations"),
    enabled: true,
  },
  {
    id: "module-configuration-diffs",
    slug: "module-configuration-diffs",
    label: "Configuration Diffs",
    route: buildControlPlanePlatformPath("module-configuration-diffs"),
    enabled: true,
  },
];

export function resolvePlatformWorkspaceTab(slug = PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG) {
  const normalized = String(slug || "").trim() || PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG;
  return (
    PLATFORM_WORKSPACE_TABS.find((tab) => tab.slug === normalized && tab.enabled)
    ?? PLATFORM_WORKSPACE_TABS.find(
      (tab) => tab.slug === PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG && tab.enabled,
    )
    ?? PLATFORM_WORKSPACE_TABS[0]
  );
}
