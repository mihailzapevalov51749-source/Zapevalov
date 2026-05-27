import { useContext, useEffect, useMemo, useState } from "react";

import AppHeaderRenderer from "../../header/components/AppHeaderRenderer";
import AppSidebarRenderer from "../../sidebar/components/AppSidebarRenderer";
import { createInitialAppShellState } from "../../provider/appShellReducer";
import { AppShellProvider } from "../../provider";
import AppShellShadowDiagnostics from "../AppShellShadowDiagnostics";
import AppShellShadowProvider, {
  AppShellShadowContext,
} from "../AppShellShadowProvider";
import { APP_SHELL_SHADOW_FLAGS } from "../appShellShadowFlags";
import {
  getDesignerShadowBridgeMeta,
  getLatestDesignerShadowSnapshot,
  listMissingDesignerSnapshotFields,
  subscribeDesignerShadowSnapshot,
} from "../designer";

import "./appShellShadowDesignerPreview.css";

const DESIGNER_NAVIGATION = [
  {
    id: "designer-objects",
    label: "Объекты",
  },
  {
    id: "designer-relations",
    label: "Связи",
  },
  {
    id: "designer-views",
    label: "Представления",
  },
  {
    id: "designer-users",
    label: "Пользователи",
  },
  {
    id: "designer-settings",
    label: "Системные настройки",
  },
];

function DesignerShadowLayout() {
  const context = useContext(AppShellShadowContext);

  if (!context) {
    return null;
  }

  const { sidebarContract, headerContract, diagnostics } = context;

  return (
    <div className="appshell-shadow-designer-preview__grid">
      <div className="appshell-shadow-designer-preview__shell">
        <div className="appshell-shadow-designer-preview__sidebar-wrap">
          {sidebarContract ? <AppSidebarRenderer contract={sidebarContract} /> : null}
        </div>
        <div className="appshell-shadow-designer-preview__main-wrap">
          {headerContract ? <AppHeaderRenderer contract={headerContract} /> : null}
          <div className="appshell-shadow-designer-preview__workspace">
            <div className="appshell-shadow-designer-preview__workspace-title">
              Designer legacy shell remains active. This is shadow observer output.
            </div>
            <pre className="appshell-shadow-designer-preview__workspace-data">
              {JSON.stringify(
                {
                  mode: diagnostics.mode,
                  activeItemId: diagnostics.activeItemId,
                  activePageId: diagnostics.activePageId,
                  designerParityStatus: diagnostics.designerParityStatus,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
      <AppShellShadowDiagnostics className="appshell-shadow-designer-preview__diagnostics" />
    </div>
  );
}

export default function AppShellShadowDesignerPreview() {
  const [collapsed, setCollapsed] = useState(false);
  const [sourcePreference, setSourcePreference] = useState("mock");
  const [bridgeState, setBridgeState] = useState(() => ({
    snapshot: getLatestDesignerShadowSnapshot(),
    lastUpdateTime: getDesignerShadowBridgeMeta().lastUpdateTime,
  }));

  useEffect(() => {
    const unsubscribe = subscribeDesignerShadowSnapshot((snapshot, lastUpdateTime) => {
      setBridgeState({ snapshot, lastUpdateTime });
    });

    return unsubscribe;
  }, []);

  const mockSnapshot = useMemo(() => {
    const state = createInitialAppShellState("designer", collapsed);
    state.navigation.activeItemId = "designer-objects";
    state.navigation.activePageId = "designer-object-types";
    state.search.enabled = false;
    state.search.value = "";
    state.notifications.enabled = false;
    state.notifications.unreadCount = 0;
    state.editMode.headerPage = false;
    state.editMode.sidebarMenu = false;

    const sources = {
      pathname: "/designer/tenant/1/object-types",
      tenantId: 1,
      title: "Типы объектов",
      subtitle: "Режим аналитика",
      designerActiveKey: "objects",
      navigationItems: DESIGNER_NAVIGATION,
      page: {
        id: "designer-object-types",
        title: "Типы объектов",
        name: "Типы объектов",
      },
      portal: {
        id: 1,
        title: "YasnoPro",
      },
      user: {
        id: "designer-user-1",
        full_name: "Аналитик",
        email: "designer@example.com",
      },
    };

    return {
      state,
      sources,
      meta: {
        sourceMode: "mock",
        sourceReason: "manual mock mode selected for diagnostics comparison",
        designerSnapshot: {
          mode: "designer",
          collapsed,
          activeItemId: "designer-objects",
          activePageId: "designer-object-types",
          activeDesignerObjectId: "object-type-1",
          navigation: DESIGNER_NAVIGATION,
          title: "Типы объектов",
          subtitle: "Режим аналитика",
          capabilities: state.capabilities,
          geometry: state.geometry,
          timestamp: Date.now(),
        },
        missingFields: [],
      },
    };
  }, [collapsed]);

  const snapshot = useMemo(() => {
    if (sourcePreference !== "bridge") {
      return mockSnapshot;
    }

    const bridgeSnapshot = bridgeState.snapshot;
    const missingFields = listMissingDesignerSnapshotFields(bridgeSnapshot);
    const lastUpdateTime = bridgeState.lastUpdateTime ?? null;
    const snapshotAgeMs =
      typeof bridgeSnapshot?.timestamp === "number"
        ? Math.max(0, Date.now() - bridgeSnapshot.timestamp)
        : null;

    if (!bridgeSnapshot || missingFields.length > 0) {
      return {
        ...mockSnapshot,
        meta: {
          ...mockSnapshot.meta,
          sourceMode: "unavailable",
          sourceReason: "designer bridge snapshot unavailable or incomplete",
          missingFields,
          lastUpdateTime,
          snapshotAgeMs,
          designerSnapshot: bridgeSnapshot ?? null,
        },
      };
    }

    const state = createInitialAppShellState("designer", Boolean(bridgeSnapshot.collapsed));
    state.navigation.activeItemId = bridgeSnapshot.activeItemId ?? null;
    state.navigation.activePageId =
      bridgeSnapshot.activeDesignerObjectId ??
      bridgeSnapshot.activePageId ??
      null;
    state.search.enabled = false;
    state.search.value = "";
    state.notifications.enabled = false;
    state.notifications.unreadCount = 0;

    const title = String(bridgeSnapshot.header?.title ?? "Типы объектов");
    const subtitle = String(bridgeSnapshot.header?.subtitle ?? "Режим аналитика");
    const activeKey = String(bridgeSnapshot.activeItemId ?? "")
      .replace(/^designer-/, "");

    return {
      state,
      sources: {
        pathname: String(bridgeSnapshot.pathname ?? "/designer/tenant/1/object-types"),
        tenantId: 1,
        title,
        subtitle,
        designerActiveKey: activeKey || "objects",
        navigationItems: Array.isArray(bridgeSnapshot.navigation)
          ? bridgeSnapshot.navigation
          : DESIGNER_NAVIGATION,
        page: {
          id: bridgeSnapshot.activeDesignerObjectId ?? bridgeSnapshot.activePageId ?? "designer-object-types",
          title,
          name: title,
        },
        portal: {
          id: 1,
          title: "YasnoPro",
        },
        user: {
          id: "designer-user-1",
          full_name: "Аналитик",
          email: "designer@example.com",
        },
      },
      meta: {
        sourceMode: "bridge",
        sourceReason: null,
        missingFields,
        lastUpdateTime,
        snapshotAgeMs,
        designerSnapshot: bridgeSnapshot,
      },
    };
  }, [sourcePreference, bridgeState, mockSnapshot]);

  return (
    <div className="appshell-shadow-designer-preview">
      <header className="appshell-shadow-designer-preview__header">
        <h1 className="appshell-shadow-designer-preview__title">
          AppShell Shadow Designer Preview
        </h1>
        <p className="appshell-shadow-designer-preview__hint">
          Dev-only designer parity diagnostics. No production replacement, no real
          action execution, no designer navigation changes.
        </p>
        <div className="appshell-shadow-designer-preview__toolbar">
          <button
            type="button"
            className="appshell-shadow-designer-preview__button"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            Toggle collapsed: {collapsed ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            className="appshell-shadow-designer-preview__button"
            onClick={() => setSourcePreference("mock")}
          >
            Mock snapshot
          </button>
          <button
            type="button"
            className="appshell-shadow-designer-preview__button"
            onClick={() => setSourcePreference("bridge")}
          >
            Bridge snapshot
          </button>
          <span className="appshell-shadow-designer-preview__mode">
            sourceMode: {snapshot.meta.sourceMode}
          </span>
          <span className="appshell-shadow-designer-preview__flag">
            dev flag `yasnopro:dev:appshell-shadow`:{" "}
            {APP_SHELL_SHADOW_FLAGS.enabled ? "enabled" : "disabled"}
          </span>
        </div>
      </header>

      <AppShellProvider mode="designer" initialSources={snapshot.sources}>
        <AppShellShadowProvider snapshot={snapshot}>
          <DesignerShadowLayout />
        </AppShellShadowProvider>
      </AppShellProvider>
    </div>
  );
}
