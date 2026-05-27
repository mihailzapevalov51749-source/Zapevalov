import { createContext, useMemo } from "react";

import { buildHeaderContract, buildSidebarContract } from "../provider/appShellContracts";
import { createInitialAppShellState } from "../provider/appShellReducer";
import { readShellSidebarCollapsed } from "../useShellSidebarState";

/** @type {import("react").Context<any>} */
export const AppShellShadowContext = createContext(null);

function collectNavigationItemIds(items, bucket = new Set()) {
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    if (item.id != null) {
      bucket.add(String(item.id));
    }

    if (Array.isArray(item.children)) {
      collectNavigationItemIds(item.children, bucket);
    }
  });

  return bucket;
}

function resolvePageId(page) {
  if (!page || typeof page !== "object") {
    return null;
  }

  return page.id ?? page.page_id ?? null;
}

function resolvePageTitle(page) {
  if (!page || typeof page !== "object") {
    return "";
  }

  return String(page.title ?? page.name ?? "").trim();
}

function resolveCheckStatus({ pass, warn, notApplicable }) {
  if (notApplicable) return "not_applicable";
  if (pass) return "pass";
  if (warn) return "warn";
  return "fail";
}

function buildRuntimeParityChecks({
  state,
  sources,
  sidebarContract,
  headerContract,
  sourceMode,
  sourceReason,
  snapshotMeta,
  missingFields,
}) {
  const checks = [];
  const runtimeSnapshot = snapshotMeta?.runtimeSnapshot ?? null;
  const sourceFreshness = snapshotMeta?.sourceFreshness ?? "unknown";

  const pageId = resolvePageId(sources.page);
  const pageTitle = resolvePageTitle(sources.page);
  const activePageId = state.navigation.activePageId;
  const activeItemId = state.navigation.activeItemId;
  const navigationIds = collectNavigationItemIds(runtimeSnapshot?.navigation ?? sources.navigationItems);
  const sidebarItemCount =
    sidebarContract?.sections?.reduce(
      (acc, section) => acc + (section?.items?.length ?? 0),
      0
    ) ?? 0;
  const geometry = state.geometry ?? {};
  const legacyCollapsed = readShellSidebarCollapsed();
  const snapshotSearchEnabled = runtimeSnapshot?.search?.enabled;
  const snapshotNotificationsEnabled = runtimeSnapshot?.notifications?.enabled;

  checks.push({
    key: "sourceModeBridge",
    label: "sourceMode === bridge",
    status: resolveCheckStatus({ pass: sourceMode === "bridge" }),
    details:
      sourceMode === "bridge"
        ? "Bridge source active"
        : `Current sourceMode: ${sourceMode}`,
  });

  checks.push({
    key: "snapshotFreshness",
    label: "snapshot freshness !== expired",
    status: resolveCheckStatus({
      pass: sourceFreshness === "fresh" || sourceFreshness === "stale",
      warn: sourceFreshness === "unknown",
    }),
    details: `Freshness: ${sourceFreshness}`,
  });

  checks.push({
    key: "activePageMatchesPageId",
    label: "activePageId совпадает с page.id",
    status: resolveCheckStatus({
      pass: pageId != null && String(activePageId) === String(pageId),
      notApplicable: pageId == null,
    }),
    details:
      pageId == null
        ? "Page id unavailable"
        : `activePageId=${activePageId}, pageId=${pageId}`,
  });

  checks.push({
    key: "activeItemExistsInNavigation",
    label: "activeItemId найден в navigation",
    status: resolveCheckStatus({
      pass:
        activeItemId != null &&
        navigationIds.size > 0 &&
        navigationIds.has(String(activeItemId)),
      warn: activeItemId == null || navigationIds.size === 0,
    }),
    details:
      activeItemId == null
        ? "activeItemId is empty"
        : navigationIds.size === 0
          ? "Navigation ids unavailable"
          : `activeItemId=${activeItemId}`,
  });

  checks.push({
    key: "sidebarItemCountPositive",
    label: "sidebar item count > 0",
    status: resolveCheckStatus({ pass: sidebarItemCount > 0 }),
    details: `sidebarItemCount=${sidebarItemCount}`,
  });

  checks.push({
    key: "headerTitleMatchesPage",
    label: "headerTitle совпадает с page.title/name",
    status: resolveCheckStatus({
      pass:
        Boolean(pageTitle) &&
        String(headerContract?.title ?? "").trim() === pageTitle,
      notApplicable: !pageTitle,
    }),
    details:
      pageTitle
        ? `headerTitle="${headerContract?.title ?? ""}", pageTitle="${pageTitle}"`
        : "Page title unavailable",
  });

  checks.push({
    key: "collapsedMatchesLegacy",
    label: "collapsed совпадает с legacy collapsed value",
    status: resolveCheckStatus({
      pass: state.collapsed === legacyCollapsed,
    }),
    details: `state.collapsed=${state.collapsed}, legacy=${legacyCollapsed}`,
  });

  checks.push({
    key: "searchAvailability",
    label: "search.enabled корректно отражает runtime search availability",
    status: resolveCheckStatus({
      pass:
        typeof snapshotSearchEnabled === "boolean" &&
        Boolean(headerContract?.search?.enabled) === snapshotSearchEnabled,
      warn: typeof snapshotSearchEnabled !== "boolean",
    }),
    details:
      typeof snapshotSearchEnabled === "boolean"
        ? `header=${Boolean(headerContract?.search?.enabled)}, runtime=${snapshotSearchEnabled}`
        : "Runtime search availability is not provided",
  });

  checks.push({
    key: "notificationsAvailability",
    label: "notifications.enabled корректно отражает availability",
    status: resolveCheckStatus({
      pass:
        typeof snapshotNotificationsEnabled === "boolean" &&
        Boolean(headerContract?.notifications?.enabled) ===
          snapshotNotificationsEnabled,
      warn: typeof snapshotNotificationsEnabled !== "boolean",
    }),
    details:
      typeof snapshotNotificationsEnabled === "boolean"
        ? `header=${Boolean(headerContract?.notifications?.enabled)}, runtime=${snapshotNotificationsEnabled}`
        : "Runtime notifications availability is not provided",
  });

  checks.push({
    key: "notificationsUnreadCountNumber",
    label: "notifications.unreadCount является number",
    status: resolveCheckStatus({
      pass: typeof headerContract?.notifications?.unreadCount === "number",
    }),
    details: `unreadCount=${headerContract?.notifications?.unreadCount}`,
  });

  const geometryFilled =
    Number.isFinite(geometry.sidebarWidth) &&
    Number.isFinite(geometry.workspaceLeftOffset) &&
    Number.isFinite(geometry.workspaceTopOffset);
  checks.push({
    key: "geometryOffsetsFilled",
    label: "geometry offsets заполнены",
    status: resolveCheckStatus({ pass: geometryFilled }),
    details: `sidebarWidth=${geometry.sidebarWidth}, workspaceLeftOffset=${geometry.workspaceLeftOffset}, workspaceTopOffset=${geometry.workspaceTopOffset}`,
  });

  checks.push({
    key: "missingFieldsExplained",
    label: "missingFields пустой или явно объяснён",
    status: resolveCheckStatus({
      pass: missingFields.length === 0,
      warn: missingFields.length > 0 && Boolean(sourceReason),
    }),
    details:
      missingFields.length === 0
        ? "No missing fields"
        : sourceReason
          ? `Missing: ${missingFields.join(", ")}; reason: ${sourceReason}`
          : `Missing: ${missingFields.join(", ")}`,
  });

  return checks;
}

function buildDesignerParityChecks({
  state,
  sources,
  sidebarContract,
  headerContract,
  sourceMode,
  sourceReason,
  snapshotMeta,
  missingFields,
}) {
  const checks = [];
  const navigationIds = collectNavigationItemIds(
    snapshotMeta?.designerSnapshot?.navigation ?? sources.navigationItems,
  );
  const sidebarItemCount =
    sidebarContract?.sections?.reduce(
      (acc, section) => acc + (section?.items?.length ?? 0),
      0
    ) ?? 0;
  const modeActions = Array.isArray(headerContract?.modeActions)
    ? headerContract.modeActions
    : [];
  const hasRuntimeSwitch = modeActions.some((action) => {
    const key = String(action?.actionKey ?? "").toLowerCase();
    const id = String(action?.id ?? "").toLowerCase();
    return (
      key.includes("runtime") ||
      key.includes("switch") ||
      key.includes("switch-to-runtime") ||
      id.includes("runtime") ||
      id.includes("switch")
    );
  });
  const capabilities = state.capabilities ?? null;
  const geometry = state.geometry ?? {};

  checks.push({
    key: "designerSourceModeValid",
    label: "sourceMode === bridge (readiness criterion)",
    status: resolveCheckStatus({
      pass: sourceMode === "bridge",
      warn: sourceMode === "unavailable" && Boolean(sourceReason),
    }),
    details:
      sourceMode === "bridge"
        ? "Bridge source active"
        : sourceReason
          ? `sourceMode=${sourceMode}; reason=${sourceReason}`
          : `sourceMode=${sourceMode}`,
  });

  checks.push({
    key: "designerModeIsDesigner",
    label: "mode === designer",
    status: resolveCheckStatus({ pass: state.mode === "designer" }),
    details: `mode=${state.mode}`,
  });

  checks.push({
    key: "designerSidebarSectionsItemsExist",
    label: "sidebar sections/items exist",
    status: resolveCheckStatus({ pass: sidebarItemCount > 0 }),
    details: `sidebarItemCount=${sidebarItemCount}`,
  });

  checks.push({
    key: "designerActiveItemExists",
    label: "active item exists",
    status: resolveCheckStatus({
      pass:
        state.navigation.activeItemId != null &&
        navigationIds.has(String(state.navigation.activeItemId)),
      warn: state.navigation.activeItemId == null,
    }),
    details:
      state.navigation.activeItemId == null
        ? "activeItemId is empty"
        : `activeItemId=${state.navigation.activeItemId}`,
  });

  checks.push({
    key: "designerHeaderTitleExists",
    label: "header title exists",
    status: resolveCheckStatus({
      pass: Boolean(String(headerContract?.title ?? "").trim()),
    }),
    details: `headerTitle="${headerContract?.title ?? ""}"`,
  });

  checks.push({
    key: "designerModeActionsContainRuntimeSwitch",
    label: "modeActions include switch/runtime action",
    status: resolveCheckStatus({
      pass: hasRuntimeSwitch,
      warn: modeActions.length === 0,
    }),
    details: `modeActionsCount=${modeActions.length}`,
  });

  checks.push({
    key: "designerCapabilitiesExist",
    label: "capabilities exist",
    status: resolveCheckStatus({
      pass: Boolean(capabilities && typeof capabilities === "object"),
    }),
    details: capabilities ? "capabilities present" : "capabilities missing",
  });

  const geometryFilled =
    Number.isFinite(geometry.sidebarWidth) &&
    Number.isFinite(geometry.workspaceLeftOffset) &&
    Number.isFinite(geometry.workspaceTopOffset);
  checks.push({
    key: "designerGeometryOffsetsFilled",
    label: "geometry offsets filled",
    status: resolveCheckStatus({ pass: geometryFilled }),
    details: `sidebarWidth=${geometry.sidebarWidth}, workspaceLeftOffset=${geometry.workspaceLeftOffset}, workspaceTopOffset=${geometry.workspaceTopOffset}`,
  });

  checks.push({
    key: "designerCollapsedBoolean",
    label: "collapsed value boolean",
    status: resolveCheckStatus({ pass: typeof state.collapsed === "boolean" }),
    details: `collapsed=${state.collapsed}`,
  });

  checks.push({
    key: "designerMissingFieldsExplained",
    label: "missingFields empty or explained",
    status: resolveCheckStatus({
      pass: missingFields.length === 0,
      warn: missingFields.length > 0 && Boolean(sourceReason),
    }),
    details:
      missingFields.length === 0
        ? "No missing fields"
        : sourceReason
          ? `Missing: ${missingFields.join(", ")}; reason: ${sourceReason}`
          : `Missing: ${missingFields.join(", ")}`,
  });

  return checks;
}

function createShadowDiagnostics({
  state,
  sources,
  sidebarContract,
  headerContract,
  sourceMode,
  sourceReason,
  snapshotMeta,
}) {
  const sidebarItemCount =
    sidebarContract?.sections?.reduce(
      (acc, section) => acc + (section?.items?.length ?? 0),
      0
    ) ?? 0;

  const snapshotAgeMs =
    typeof snapshotMeta?.snapshotAgeMs === "number"
      ? snapshotMeta.snapshotAgeMs
      : null;
  const freshness =
    snapshotAgeMs == null
      ? "unknown"
      : snapshotAgeMs <= 5000
        ? "fresh"
        : snapshotAgeMs <= 15000
          ? "stale"
          : "expired";
  const missingFields = Array.isArray(snapshotMeta?.missingFields)
    ? snapshotMeta.missingFields
    : [];

  const runtimeParityWarnings = [];
  if (state.mode !== "runtime") {
    runtimeParityWarnings.push("mode is not runtime");
  }
  if (!sidebarContract?.sections?.length) {
    runtimeParityWarnings.push("sidebar sections are empty");
  }
  if (!headerContract?.title) {
    runtimeParityWarnings.push("header title is empty");
  }
  if (missingFields.length > 0) {
    runtimeParityWarnings.push("snapshot has missing required fields");
  }

  const parityChecks = buildRuntimeParityChecks({
    state,
    sources,
    sidebarContract,
    headerContract,
    sourceMode,
    sourceReason,
    snapshotMeta: {
      ...snapshotMeta,
      sourceFreshness: freshness,
    },
    missingFields,
  });

  const passedChecks = parityChecks
    .filter((check) => check.status === "pass")
    .map((check) => check.key);
  const warningChecks = parityChecks
    .filter((check) => check.status === "warn")
    .map((check) => check.key);
  const failedChecks = parityChecks
    .filter((check) => check.status === "fail")
    .map((check) => check.key);

  let parityStatus = "pass";
  if (failedChecks.length > 0) {
    parityStatus = "fail";
  } else if (warningChecks.length > 0) {
    parityStatus = "partial";
  }

  const designerParityChecks = buildDesignerParityChecks({
    state,
    sources,
    sidebarContract,
    headerContract,
    sourceMode,
    sourceReason,
    snapshotMeta,
    missingFields,
  });
  const designerPassedChecks = designerParityChecks
    .filter((check) => check.status === "pass")
    .map((check) => check.key);
  const designerWarningChecks = designerParityChecks
    .filter((check) => check.status === "warn")
    .map((check) => check.key);
  const designerFailedChecks = designerParityChecks
    .filter((check) => check.status === "fail")
    .map((check) => check.key);

  let designerParityStatus = "pass";
  if (designerFailedChecks.length > 0) {
    designerParityStatus = "fail";
  } else if (designerWarningChecks.length > 0) {
    designerParityStatus = "partial";
  }

  return {
    sourceMode,
    sourceReason: sourceReason ?? null,
    snapshotAgeMs,
    lastUpdateTime: snapshotMeta?.lastUpdateTime ?? null,
    sourceFreshness: freshness,
    missingFields,
    runtimeParityWarnings,
    parityChecks,
    parityStatus,
    failedChecks,
    warningChecks,
    passedChecks,
    designerParityChecks,
    designerParityStatus,
    designerFailedChecks,
    designerWarningChecks,
    designerPassedChecks,
    mode: state.mode,
    collapsed: state.collapsed,
    activeItemId: state.navigation.activeItemId,
    activePageId: state.navigation.activePageId,
    hasSidebarContract: Boolean(sidebarContract),
    hasHeaderContract: Boolean(headerContract),
    sidebarSectionCount: sidebarContract?.sections?.length ?? 0,
    sidebarItemCount,
    headerTitle: headerContract?.title ?? "",
    searchEnabled: headerContract?.search?.enabled ?? false,
    searchValue: headerContract?.search?.value ?? "",
    notificationsEnabled: headerContract?.notifications?.enabled ?? false,
    unreadCount: headerContract?.notifications?.unreadCount ?? 0,
    geometryOffsets: {
      sidebarWidth: state.geometry.sidebarWidth,
      workspaceLeftOffset: state.geometry.workspaceLeftOffset,
      workspaceTopOffset: state.geometry.workspaceTopOffset,
    },
    snapshotPathname: sources.pathname ?? "",
    timestamp: Date.now(),
  };
}

/**
 * Dev-only shadow observer for AppShell contracts.
 * Not connected to production layouts in Phase 6.8.
 */
export default function AppShellShadowProvider({
  snapshot,
  children,
}) {
  const state = snapshot?.state ?? createInitialAppShellState("runtime", false);
  const sources = snapshot?.sources ?? {};
  const sourceMode = snapshot?.meta?.sourceMode ?? "mock";
  const sourceReason = snapshot?.meta?.sourceReason ?? null;
  const snapshotMeta = snapshot?.meta ?? null;

  const dispatchAction = () => {
    // Intentionally no-op in shadow mode.
  };

  const sidebarContract = useMemo(
    () => buildSidebarContract({ state, sources, dispatchAction }),
    [state, sources]
  );

  const headerContract = useMemo(
    () => buildHeaderContract({ state, sources, dispatchAction }),
    [state, sources]
  );

  const diagnostics = useMemo(
    () =>
      createShadowDiagnostics({
        state,
        sources,
        sidebarContract,
        headerContract,
        sourceMode,
        sourceReason,
        snapshotMeta,
      }),
    [
      state,
      sources,
      sidebarContract,
      headerContract,
      sourceMode,
      sourceReason,
      snapshotMeta,
    ]
  );

  const value = useMemo(
    () => ({
      state,
      sources,
      sidebarContract,
      headerContract,
      diagnostics,
    }),
    [state, sources, sidebarContract, headerContract, diagnostics]
  );

  return (
    <AppShellShadowContext.Provider value={value}>
      {children}
    </AppShellShadowContext.Provider>
  );
}
