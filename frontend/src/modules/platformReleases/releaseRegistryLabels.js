/** Registry tab labels for release composition UI (Architecture Registry). */

export const RELEASE_REGISTRY_LABELS = {
  core: "Ядро",
  standards: "Стандарты",
  services: "Службы",
  modules: "Модули",
  components: "Компоненты",
  interface: "Интерфейс",
  data: "Данные",
  configuration: "Конфигурация",
};

export function getReleaseRegistryLabel(registryKey) {
  if (!registryKey) {
    return "—";
  }
  return RELEASE_REGISTRY_LABELS[registryKey] || registryKey;
}

export function formatComponentKey(componentKey) {
  if (!componentKey) {
    return "—";
  }
  return String(componentKey)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
