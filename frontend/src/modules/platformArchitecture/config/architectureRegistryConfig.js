/** Compositional registry tabs for Architecture Navigator (WI-ARCH-NAV-ORDER-001). */
export const ARCHITECTURE_REGISTRY_TABS = [
  { key: "overview", title: "Обзор" },
  { key: "core", title: "Ядро" },
  { key: "services", title: "Службы" },
  { key: "modules", title: "Модули" },
  { key: "data", title: "Данные" },
  { key: "interface", title: "Интерфейс" },
  { key: "components", title: "Компоненты" },
  { key: "configuration", title: "Конфигурация" },
  { key: "standards", title: "Стандарты" },
];

/** @deprecated Legacy tab keys — mapped to compositional registries (WI-ARCH-GOV-001). */
export const REGISTRY_LEGACY_ALIASES = {
  runtime: "configuration",
  publication: "configuration",
  rules: "standards",
};

export const DEFAULT_REGISTRY_TAB = "overview";

export function resolveRegistryTab(value) {
  const normalized = String(value || "").trim();
  const resolved = REGISTRY_LEGACY_ALIASES[normalized] ?? normalized;
  return ARCHITECTURE_REGISTRY_TABS.some((tab) => tab.key === resolved)
    ? resolved
    : DEFAULT_REGISTRY_TAB;
}

export function normalizeRegistrySearchParams(searchParams) {
  const rawRegistry = searchParams.get("registry");
  if (!rawRegistry) {
    return null;
  }
  const resolved = resolveRegistryTab(rawRegistry);
  if (resolved === rawRegistry) {
    return null;
  }
  const next = new URLSearchParams(searchParams);
  next.set("registry", resolved);
  return next;
}

const TAB_ORDER_INDEX = new Map(
  ARCHITECTURE_REGISTRY_TABS.map((tab, index) => [tab.key, index]),
);

/** Sort API registry rows to match Navigator tab order (overview excluded from API payloads). */
export function sortRegistriesByTabOrder(registries) {
  if (!Array.isArray(registries)) {
    return [];
  }
  return [...registries].sort((left, right) => {
    const leftIndex = TAB_ORDER_INDEX.get(left?.key) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = TAB_ORDER_INDEX.get(right?.key) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}
