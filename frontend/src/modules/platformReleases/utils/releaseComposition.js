import { formatComponentKey, getReleaseRegistryLabel } from "../releaseRegistryLabels.js";

export function countSelectedFiles(elements, selectedKeys) {
  if (!Array.isArray(elements) || !Array.isArray(selectedKeys)) {
    return 0;
  }
  const selected = new Set(selectedKeys);
  return elements
    .filter((item) => selected.has(item.component_key))
    .reduce((sum, item) => sum + Number(item.files_count || 0), 0);
}

export function mapDiffElementsToRows(elements) {
  if (!Array.isArray(elements)) {
    return [];
  }
  return elements.map((element) => ({
    componentKey: element.component_key,
    title: element.title || formatComponentKey(element.component_key),
    registryLabel: getReleaseRegistryLabel(element.registry),
    filesCount: Number(element.files_count || 0),
  }));
}

export function mapSavedElementsToRows(elementKeys) {
  if (!Array.isArray(elementKeys)) {
    return [];
  }
  return elementKeys.map((componentKey) => ({
    componentKey,
    title: formatComponentKey(componentKey),
    registryLabel: "—",
    filesCount: null,
  }));
}

export function canCreateReleaseFromDiff(diffResult, selectedKeys) {
  return Boolean(diffResult?.has_changes && Array.isArray(selectedKeys) && selectedKeys.length > 0);
}
