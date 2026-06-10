import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { buildControlPlaneClientsPath } from "../../controlPlane/config/controlPlanePaths";

const TABS = [
  { id: "overview", label: "Обзор", segment: "" },
  { id: "companies", label: "Компании", segment: "companies" },
  { id: "registry", label: "Tenant Registry", segment: "registry" },
];

function resolveActiveTab(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");

  if (/\/clients\/registry(?:\/|$)/.test(normalized)) {
    return "registry";
  }
  if (/\/clients\/companies(?:\/|$)/.test(normalized)) {
    return "companies";
  }
  if (/\/clients(?:\/|$)/.test(normalized)) {
    return "overview";
  }

  return "overview";
}

export default function ClientsSectionNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo(
    () => resolveActiveTab(location.pathname),
    [location.pathname],
  );

  const navigateTo = (segment) => {
    navigate(buildControlPlaneClientsPath(segment));
  };

  return (
    <nav
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
      }}
      aria-label="Клиенты ЯсноПро"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigateTo(tab.segment)}
            style={{
              border: isActive ? "1px solid #7c3aed" : "1px solid #e2e8f0",
              borderRadius: 999,
              padding: "8px 14px",
              background: isActive ? "#f5f3ff" : "#fff",
              color: isActive ? "#5b21b6" : "#475569",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
