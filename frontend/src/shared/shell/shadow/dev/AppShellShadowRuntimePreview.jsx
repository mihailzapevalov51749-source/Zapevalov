import { useContext, useEffect, useMemo, useState } from "react";

import AppHeaderRenderer from "../../header/components/AppHeaderRenderer";
import AppSidebarRenderer from "../../sidebar/components/AppSidebarRenderer";
import { createInitialAppShellState } from "../../provider/appShellReducer";
import { AppShellProvider, useAppShell } from "../../provider";
import AppShellShadowDiagnostics from "../AppShellShadowDiagnostics";
import AppShellShadowProvider, {
  AppShellShadowContext,
} from "../AppShellShadowProvider";
import { APP_SHELL_SHADOW_FLAGS } from "../appShellShadowFlags";
import {
  getLatestRuntimeShadowSnapshot,
  getRuntimeShadowBridgeMeta,
  listMissingRuntimeSnapshotFields,
  subscribeRuntimeShadowSnapshot,
} from "../runtime";

import "./appShellShadowRuntimePreview.css";

const RUNTIME_NAVIGATION = [
  {
    id: "runtime-home",
    title: "Главная",
    type: "page",
    path: "/runtime/home",
    is_expanded: true,
    children: [
      {
        id: "runtime-contracts",
        title: "Договоры",
        type: "page",
        path: "/runtime/contracts",
      },
      {
        id: "runtime-hidden",
        title: "Скрытый пункт",
        type: "page",
        path: "/runtime/hidden",
        is_visible: false,
      },
    ],
  },
  {
    id: "runtime-documents",
    title: "Документы",
    type: "document_library",
    path: "/runtime/documents",
  },
  {
    id: "runtime-tasks",
    title: "Мои задачи",
    type: "system_page",
    route: "/runtime/tasks",
    path: "/runtime/tasks",
  },
];

const RUNTIME_USER = {
  id: "shadow-user-1",
  name: "Михаил",
  email: "demo@example.com",
};

function RuntimeShadowLayout() {
  const context = useContext(AppShellShadowContext);

  if (!context) {
    return null;
  }

  const { sidebarContract, headerContract, diagnostics } = context;

  return (
    <div className="appshell-shadow-runtime-preview__grid">
      <div className="appshell-shadow-runtime-preview__shell">
        <div className="appshell-shadow-runtime-preview__sidebar-wrap">
          {sidebarContract ? <AppSidebarRenderer contract={sidebarContract} /> : null}
        </div>
        <div className="appshell-shadow-runtime-preview__main-wrap">
          {headerContract ? <AppHeaderRenderer contract={headerContract} /> : null}
          <div className="appshell-shadow-runtime-preview__workspace">
            <div className="appshell-shadow-runtime-preview__workspace-title">
              Legacy runtime remains source of truth. This panel is shadow output
              only.
            </div>
            <pre className="appshell-shadow-runtime-preview__workspace-data">
              {JSON.stringify(
                {
                  mode: diagnostics.mode,
                  collapsed: diagnostics.collapsed,
                  activePageId: diagnostics.activePageId,
                  activeItemId: diagnostics.activeItemId,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
      <AppShellShadowDiagnostics className="appshell-shadow-runtime-preview__diagnostics" />
    </div>
  );
}

function AppShellProviderObserver() {
  const { sidebarContract, headerContract, state } = useAppShell();

  return (
    <pre className="appshell-shadow-runtime-preview__provider-state">
      {JSON.stringify(
        {
          providerMode: state.mode,
          providerCollapsed: state.collapsed,
          providerSidebarSections: sidebarContract?.sections?.length ?? 0,
          providerHeaderTitle: headerContract?.title ?? "",
        },
        null,
        2
      )}
    </pre>
  );
}

export default function AppShellShadowRuntimePreview() {
  const [sourcePreference, setSourcePreference] = useState("mock");
  const [bridgeState, setBridgeState] = useState(() => ({
    snapshot: getLatestRuntimeShadowSnapshot(),
    lastUpdateTime: getRuntimeShadowBridgeMeta().lastUpdateTime,
  }));

  useEffect(() => {
    const unsubscribe = subscribeRuntimeShadowSnapshot((snapshot, lastUpdateTime) => {
      setBridgeState({ snapshot, lastUpdateTime });
    });

    return unsubscribe;
  }, []);

  const mockSnapshot = useMemo(() => {
    const state = createInitialAppShellState("runtime", false);
    state.navigation.activeItemId = "runtime-home";
    state.navigation.activePageId = "runtime-home";
    state.search.value = "договор";
    state.notifications.unreadCount = 7;
    state.editMode.headerPage = false;
    state.editMode.sidebarMenu = false;
    state.titleEdit.draft = "Главная";

    const sources = {
      pathname: "/runtime/home",
      tenantId: 1,
      title: "Главная",
      subtitle: "Shadow runtime preview",
      navigationItems: RUNTIME_NAVIGATION,
      page: {
        title: "Главная",
        description: "Главная страница портала",
      },
      portal: {
        id: 1,
        title: "YasnoPro",
      },
      user: RUNTIME_USER,
      breadcrumbs: [
        { id: "home", label: "Главная", path: "/runtime/home" },
        { id: "contracts", label: "Договоры", path: "/runtime/contracts" },
      ],
    };

    return {
      state,
      sources,
      meta: { sourceMode: "mock", sourceReason: null },
    };
  }, []);

  const snapshot = useMemo(() => {
    if (sourcePreference !== "real") {
      return mockSnapshot;
    }

    const bridgeSnapshot = bridgeState.snapshot;
    const missingFields = listMissingRuntimeSnapshotFields(bridgeSnapshot);
    const now = Date.now();
    const lastUpdateTime = bridgeState.lastUpdateTime ?? null;
    const snapshotAgeMs =
      typeof bridgeSnapshot?.timestamp === "number"
        ? Math.max(0, now - bridgeSnapshot.timestamp)
        : null;

    if (!bridgeSnapshot || missingFields.length > 0) {
      return {
        ...mockSnapshot,
        meta: {
          sourceMode: "unavailable",
          sourceReason:
            "real runtime sources unavailable in isolated dev route",
          lastUpdateTime,
          snapshotAgeMs,
          missingFields,
        },
      };
    }

    const title = bridgeSnapshot?.page?.title || bridgeSnapshot?.portal?.title || "Runtime";
    const subtitle = bridgeSnapshot?.page?.description || "Runtime shadow bridge snapshot";
    const state = createInitialAppShellState(
      "runtime",
      Boolean(bridgeSnapshot.collapsed),
    );
    state.navigation.activePageId = bridgeSnapshot.activePageId ?? null;
    state.navigation.activeItemId = bridgeSnapshot.activeItemId ?? null;
    state.search.value = String(bridgeSnapshot.search?.value ?? "");
    state.notifications.unreadCount = Number(bridgeSnapshot.notifications?.unreadCount ?? 0);
    state.editMode.headerPage = false;
    state.editMode.sidebarMenu = false;
    state.titleEdit.draft = String(title);

    return {
      state,
      sources: {
        pathname: String(bridgeSnapshot.pathname ?? ""),
        tenantId: Number(bridgeSnapshot.portal?.id ?? 1),
        title: String(title),
        subtitle: String(subtitle),
        navigationItems: Array.isArray(bridgeSnapshot.navigation)
          ? bridgeSnapshot.navigation
          : [],
        page: bridgeSnapshot.page ?? null,
        portal: bridgeSnapshot.portal ?? null,
        user: bridgeSnapshot.user ?? null,
        breadcrumbs: [
          {
            id: "runtime-bridge",
            label: "Runtime bridge",
            path: String(bridgeSnapshot.pathname ?? ""),
          },
        ],
      },
      meta: {
        sourceMode: "bridge",
        sourceReason: null,
        lastUpdateTime,
        snapshotAgeMs,
        missingFields,
      },
    };
  }, [sourcePreference, bridgeState, mockSnapshot]);

  const initialSources = snapshot.sources;

  return (
    <div className="appshell-shadow-runtime-preview">
      <header className="appshell-shadow-runtime-preview__header">
        <h1 className="appshell-shadow-runtime-preview__title">
          AppShell Shadow Runtime Preview
        </h1>
        <p className="appshell-shadow-runtime-preview__hint">
          Dev-only observer route: contracts and diagnostics are built from
          read-only runtime-like snapshot. No routing/API/action execution.
        </p>
        <div className="appshell-shadow-runtime-preview__toolbar">
          <button
            type="button"
            className="appshell-shadow-runtime-preview__button"
            onClick={() => setSourcePreference("mock")}
          >
            Mock snapshot
          </button>
          <button
            type="button"
            className="appshell-shadow-runtime-preview__button"
            onClick={() => setSourcePreference("real")}
          >
            Real runtime snapshot (bridge)
          </button>
          <span className="appshell-shadow-runtime-preview__mode">
            sourceMode: {snapshot.meta?.sourceMode ?? "mock"}
          </span>
          <span className="appshell-shadow-runtime-preview__flag">
            dev flag `yasnopro:dev:appshell-shadow`:{" "}
            {APP_SHELL_SHADOW_FLAGS.enabled ? "enabled" : "disabled"}
          </span>
        </div>
      </header>

      <AppShellProvider mode="runtime" initialSources={initialSources}>
        <AppShellProviderObserver />
        <AppShellShadowProvider snapshot={snapshot}>
          <RuntimeShadowLayout />
        </AppShellShadowProvider>
      </AppShellProvider>
    </div>
  );
}
