import "../../../portal/components/workspaceRuntimeTabsBar.css";
import { GOVERNANCE_TABS } from "../config/governanceTabsConfig";

export default function GovernanceTabs({ activeTab, onSelect }) {
  return (
    <div className="workspace-runtime-tabs" aria-label="Архитектурное управление">
      <nav className="workspace-runtime-tabs__list">
        {GOVERNANCE_TABS.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              className={`workspace-runtime-tabs__tab${isActive ? " is-active" : ""}`}
              onClick={() => onSelect(tab.key)}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.title}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
