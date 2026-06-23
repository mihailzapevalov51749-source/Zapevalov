export const GOVERNANCE_TABS = [
  { key: "overview", title: "Обзор" },
  { key: "constitution", title: "Архитектурная конституция" },
  { key: "adr", title: "Архитектурные решения (ADR)" },
  { key: "delivery", title: "Контур доставки изменений" },
];

export const DEFAULT_GOVERNANCE_TAB = "overview";

export function resolveGovernanceTab(value) {
  const normalized = String(value || "").trim();
  return GOVERNANCE_TABS.some((tab) => tab.key === normalized)
    ? normalized
    : DEFAULT_GOVERNANCE_TAB;
}

export function normalizeGovernanceSearchParams(searchParams) {
  const rawTab = searchParams.get("tab");
  if (!rawTab) {
    return null;
  }
  const resolved = resolveGovernanceTab(rawTab);
  if (resolved === rawTab) {
    return null;
  }
  const next = new URLSearchParams(searchParams);
  next.set("tab", resolved);
  return next;
}
