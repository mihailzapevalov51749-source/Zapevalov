import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import CompaniesClientsTab from "../companies/CompaniesClientsTab";
import CompaniesLicensesTab from "../companies/CompaniesLicensesTab";
import CompaniesWorkspaceTabs from "../companies/CompaniesWorkspaceTabs";
import { resolveCompaniesWorkspaceTab } from "../companies/companiesWorkspaceConfig.js";

import "../companies/companiesWorkspacePage.css";

function resolveActiveTabSlug(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const match = normalized.match(/\/control-plane\/companies\/([^/]+)/);
  return match?.[1] || "clients";
}

export default function CompaniesWorkspacePage() {
  const location = useLocation();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname),
    [location.pathname],
  );
  const activeTab = resolveCompaniesWorkspaceTab(activeSlug);

  function renderActiveTab() {
    if (activeTab.slug === "licenses") {
      return <CompaniesLicensesTab />;
    }
    return <CompaniesClientsTab />;
  }

  return (
    <div className="companies-workspace">
      <CompaniesWorkspaceTabs />
      <div className="companies-workspace__canvas" data-page-canvas>
        {renderActiveTab()}
      </div>
    </div>
  );
}
