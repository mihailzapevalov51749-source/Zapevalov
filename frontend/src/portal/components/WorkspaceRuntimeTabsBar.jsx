import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ensureDesignerWorkspaceTabs,
  getDesignerWorkspaceBySlug,
  listDesignerWorkspaceTabs,
} from "../../modules/designer/api/designerApi";
import ObjectContextMenuTrigger from "../../shared/objectPlatform/objectContextMenu/ObjectContextMenuTrigger";
import "../../shared/objectPlatform/objectContextMenu/objectContextMenu.css";
import "./workspaceRuntimeTabsBar.css";

const MODE_TOKENS = {
  runtime: {
    accent: "#2563EB",
    accentSoft: "rgba(37, 99, 235, 0.1)",
  },
  designer: {
    accent: "#7C3AED",
    accentSoft: "rgba(124, 58, 237, 0.1)",
  },
};

export default function WorkspaceRuntimeTabsBar({
  portalId,
  workspaceSlug,
  activeTabSlug,
  mode = "runtime",
  activeTabMenuInTab = false,
  objectMenuContext = null,
}) {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const workspaceData = await getDesignerWorkspaceBySlug(portalId, workspaceSlug);
        if (!workspaceData?.id) return;
        await ensureDesignerWorkspaceTabs(portalId, workspaceData.id);
        const tabsResponse = await listDesignerWorkspaceTabs(portalId, workspaceData.id, {
          forUserMenu: true,
        });
        if (cancelled) return;
        setWorkspace(workspaceData);
        const allTabs = Array.isArray(tabsResponse?.tabs) ? tabsResponse.tabs : [];
        setTabs(allTabs.filter((item) => item?.is_visible !== false));
      } catch {
        if (!cancelled) {
          setTabs([]);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [portalId, workspaceSlug]);

  const normalizedActiveSlug = String(activeTabSlug || "").trim();
  const resolvedActiveSlug = useMemo(() => {
    if (normalizedActiveSlug) return normalizedActiveSlug;
    const home = tabs.find((item) => item.is_system);
    return String(home?.slug || "");
  }, [normalizedActiveSlug, tabs]);

  const menuContextProps = useMemo(() => {
    if (!objectMenuContext || typeof objectMenuContext !== "object") {
      return null;
    }

    return {
      tenantId: objectMenuContext.tenantId ?? null,
      objectTypeKey: objectMenuContext.objectTypeKey ?? null,
      objectTypeId: objectMenuContext.objectTypeId ?? null,
      objectName: objectMenuContext.objectName ?? "Объект",
    };
  }, [objectMenuContext]);

  if (!workspace || tabs.length === 0) {
    return null;
  }

  const tokens = MODE_TOKENS[mode] || MODE_TOKENS.runtime;

  return (
    <div
      className="workspace-runtime-tabs"
      style={{
        "--workspace-tabs-accent": tokens.accent,
        "--workspace-tabs-accent-soft": tokens.accentSoft,
      }}
    >
      <nav className="workspace-runtime-tabs__list" aria-label="Вкладки пространства">
        {tabs.map((tab) => {
          const isActive = String(tab.slug || "") === resolvedActiveSlug;
          const showMenuInTab =
            isActive && activeTabMenuInTab === true && menuContextProps != null;

          if (showMenuInTab) {
            return (
              <div
                key={tab.id}
                className="workspace-runtime-tabs__tab is-active workspace-runtime-tabs__tab-with-menu"
                aria-current="page"
              >
                <ObjectContextMenuTrigger
                  className="workspace-runtime-tabs__tab-menu-trigger"
                  variant="tab"
                  label={tab.title}
                  {...menuContextProps}
                />
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              className={`workspace-runtime-tabs__tab${isActive ? " is-active" : ""}`}
              onClick={() =>
                navigate(`/portal/${portalId}/workspaces/${workspace.slug}/${tab.slug}`)
              }
            >
              {tab.title}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
