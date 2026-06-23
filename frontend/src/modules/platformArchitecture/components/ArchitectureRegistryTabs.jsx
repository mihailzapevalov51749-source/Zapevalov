import "../../../portal/components/workspaceRuntimeTabsBar.css";
import { ARCHITECTURE_REGISTRY_TABS } from "../config/architectureRegistryConfig";

export default function ArchitectureRegistryTabs({
  activeRegistry,
  onSelect,
  onOpenDocument,
  openingDocument = false,
  onScan,
  scanning = false,
}) {
  return (
    <div className="workspace-runtime-tabs platform-architecture__registry-tabs" aria-label="Реестры архитектуры">
      <nav className="workspace-runtime-tabs__list">
        {ARCHITECTURE_REGISTRY_TABS.map((tab) => {
          const isActive = tab.key === activeRegistry;

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

      <div className="platform-architecture__registry-tabs-actions">
        {typeof onOpenDocument === "function" ? (
          <button
            type="button"
            className="designer-btn platform-architecture__document-btn"
            onClick={onOpenDocument}
            disabled={openingDocument}
          >
            {openingDocument ? "Открытие…" : "Документ"}
          </button>
        ) : null}
        {typeof onScan === "function" ? (
          <button
            type="button"
            className="designer-btn designer-btn--primary platform-architecture__scan-btn"
            onClick={onScan}
            disabled={scanning}
          >
            {scanning ? "Сканирование…" : "Запустить сканирование"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
