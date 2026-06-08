import ObjectRuntimeTopPanelActions from "../../modules/runtimeActions/components/ObjectRuntimeTopPanelActions";
import ObjectTypeIcon from "../../shared/icons/ObjectTypeIcon";
import ObjectContextMenuTrigger from "../../shared/objectPlatform/objectContextMenu/ObjectContextMenuTrigger";

import "../../shared/objectPlatform/objectContextMenu/objectContextMenu.css";
import "./workspaceRuntimeTabsBar.css";
import "./portalObjectRuntimeHeader.css";

const RUNTIME_TAB_TOKENS = {
  accent: "#2563EB",
  accentSoft: "rgba(37, 99, 235, 0.1)",
};

function resolveObjectTabKey(tab) {
  return String(tab?.key ?? "").trim();
}

function mergeResolvedActiveTab(activeTab, activeTabFromList, resolvedActiveKey) {
  if (activeTabFromList) {
    const activeTabKey = resolveObjectTabKey(activeTab);
    const menuInTabFromProp =
      activeTab &&
      activeTabKey === resolvedActiveKey &&
      activeTab.menuInTab === true;

    return {
      ...activeTabFromList,
      menuInTab: menuInTabFromProp || Boolean(activeTabFromList.menuInTab),
    };
  }

  return activeTab || null;
}

/**
 * Office object runtime header — identity block + object tabs (workspace tab style).
 */
export default function PortalObjectRuntimeHeader({
  objectName = "Объект",
  tenantId = null,
  objectTypeKey = null,
  objectTypeId = null,
  iconType = null,
  iconFileUrl = null,
  color = null,
  tabs = [],
  activeTab = null,
  activeTabKey = null,
  onSelectTab = null,
}) {
  const tabItems = Array.isArray(tabs) ? tabs : [];
  const resolvedActiveKey =
    String(activeTabKey || "").trim() ||
    resolveObjectTabKey(activeTab) ||
    resolveObjectTabKey(tabItems[0]);
  const activeTabFromList =
    tabItems.find((tab) => resolveObjectTabKey(tab) === resolvedActiveKey) || null;
  const resolvedActiveTab = mergeResolvedActiveTab(
    activeTab,
    activeTabFromList,
    resolvedActiveKey,
  );
  const shouldRenderMenuInActiveTab = resolvedActiveTab?.menuInTab === true;
  const shouldRenderObjectIdentity = !shouldRenderMenuInActiveTab;
  const renderHeaderWrapper = shouldRenderObjectIdentity || tabItems.length > 0;

  const menuContextProps = {
    tenantId,
    objectTypeKey,
    objectTypeId,
    objectName,
  };

  if (!renderHeaderWrapper) {
    return null;
  }

  const tabsBar =
    tabItems.length > 0 ? (
      <div
        className="workspace-runtime-tabs portal-object-runtime-header__tabs"
        style={{
          "--workspace-tabs-accent": RUNTIME_TAB_TOKENS.accent,
          "--workspace-tabs-accent-soft": RUNTIME_TAB_TOKENS.accentSoft,
        }}
      >
        <nav className="workspace-runtime-tabs__list" aria-label="Вкладки объекта">
          {tabItems.map((tab) => {
            const tabKey = resolveObjectTabKey(tab);
            const isActive = tabKey === resolvedActiveKey;
            const showMenuInTab = shouldRenderMenuInActiveTab && isActive;
            const tabLabel = isActive
              ? resolvedActiveTab?.name || tab.name
              : tab.name;

            if (showMenuInTab) {
              return (
                <div
                  key={tabKey}
                  className="workspace-runtime-tabs__tab is-active portal-object-runtime-header__tab-with-menu"
                  aria-current="page"
                >
                  <ObjectContextMenuTrigger
                    className="portal-object-runtime-header__tab-context-trigger"
                    variant="tab"
                    label={tabLabel}
                    {...menuContextProps}
                  />
                </div>
              );
            }

            return (
              <button
                key={tabKey}
                type="button"
                className={`workspace-runtime-tabs__tab${isActive ? " is-active" : ""}`}
                onClick={() => onSelectTab?.(tabKey)}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>
    ) : null;

  if (shouldRenderMenuInActiveTab && !shouldRenderObjectIdentity) {
    return (
      <div
        className="portal-object-runtime-header portal-object-runtime-header--menu-in-tab"
        aria-label="Вкладки объекта"
      >
        <ObjectRuntimeTopPanelActions
          tenantId={tenantId}
          objectTypeKey={objectTypeKey}
          placementKey="top_panel"
        />
        {tabsBar}
      </div>
    );
  }

  return (
    <header className="portal-object-runtime-header" aria-label="Объект">
      {shouldRenderObjectIdentity ? (
        <div className="portal-object-runtime-header__identity">
          <ObjectTypeIcon
            iconType={iconType}
            iconFileUrl={iconFileUrl}
            color={color}
            size={28}
            className="object-type-icon--header portal-object-runtime-header__icon"
          />
          <h1 className="portal-object-runtime-header__title">
            <ObjectContextMenuTrigger
              className="portal-object-runtime-header__context-trigger"
              {...menuContextProps}
            />
          </h1>
        </div>
      ) : null}

      <ObjectRuntimeTopPanelActions
        tenantId={tenantId}
        objectTypeKey={objectTypeKey}
        placementKey="top_panel"
      />

      {tabsBar}
    </header>
  );
}
