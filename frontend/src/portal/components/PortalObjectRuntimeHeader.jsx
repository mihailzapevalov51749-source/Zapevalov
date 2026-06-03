import ObjectTypeIcon from "../../shared/icons/ObjectTypeIcon";

import "./workspaceRuntimeTabsBar.css";
import "./portalObjectRuntimeHeader.css";

const RUNTIME_TAB_TOKENS = {
  accent: "#2563EB",
  accentSoft: "rgba(37, 99, 235, 0.1)",
};

/**
 * Office object runtime header — identity block + object tabs (workspace tab style).
 */
export default function PortalObjectRuntimeHeader({
  objectName = "Объект",
  iconType = null,
  iconFileUrl = null,
  color = null,
  tabs = [],
  activeTabKey = null,
  onSelectTab = null,
}) {
  const tabItems = Array.isArray(tabs) ? tabs : [];
  const resolvedActiveKey =
    String(activeTabKey || "").trim() || String(tabItems[0]?.key || "").trim();

  return (
    <header className="portal-object-runtime-header" aria-label="Объект">
      <div className="portal-object-runtime-header__identity">
        <ObjectTypeIcon
          iconType={iconType}
          iconFileUrl={iconFileUrl}
          color={color}
          size={28}
          className="object-type-icon--header portal-object-runtime-header__icon"
        />
        <h1 className="portal-object-runtime-header__title">{objectName}</h1>
      </div>

      {tabItems.length > 0 ? (
        <div
          className="workspace-runtime-tabs portal-object-runtime-header__tabs"
          style={{
            "--workspace-tabs-accent": RUNTIME_TAB_TOKENS.accent,
            "--workspace-tabs-accent-soft": RUNTIME_TAB_TOKENS.accentSoft,
          }}
        >
          <nav className="workspace-runtime-tabs__list" aria-label="Вкладки объекта">
            {tabItems.map((tab) => {
              const isActive = String(tab.key) === resolvedActiveKey;

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`workspace-runtime-tabs__tab${isActive ? " is-active" : ""}`}
                  onClick={() => onSelectTab?.(tab.key)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
