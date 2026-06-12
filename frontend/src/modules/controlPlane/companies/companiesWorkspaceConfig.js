import { buildControlPlaneCompaniesPath } from "../config/controlPlanePaths.js";

export const COMPANIES_WORKSPACE_TABS = [
  {
    id: "clients",
    slug: "clients",
    label: "Клиенты",
    route: buildControlPlaneCompaniesPath("clients"),
    enabled: true,
  },
];

export function resolveCompaniesWorkspaceTab(slug = "clients") {
  const normalized = String(slug || "").trim() || "clients";
  return (
    COMPANIES_WORKSPACE_TABS.find((tab) => tab.slug === normalized && tab.enabled)
    ?? COMPANIES_WORKSPACE_TABS[0]
  );
}
