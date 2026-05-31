import { getStoredCurrentUser } from "../modules/designer/constants/designerRoles.js";

const PLATFORM_DASHBOARD_SESSION_KEY = "yasii-platform-dashboard-session-id";

export function getPlatformDashboardSessionId() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return `pds-${Date.now()}`;
  }

  let sessionId = window.sessionStorage.getItem(PLATFORM_DASHBOARD_SESSION_KEY);
  if (!sessionId) {
    sessionId = `pds-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(PLATFORM_DASHBOARD_SESSION_KEY, sessionId);
  }

  return sessionId;
}

export function resolvePlatformDashboardUserId() {
  const user = getStoredCurrentUser();
  const rawId = user?.id ?? user?.user_id ?? user?.userId;
  return rawId != null && String(rawId).trim() ? String(rawId) : "anonymous";
}

export function buildPlatformDashboardHostContext({
  tenantId,
  userId,
  selectedScope,
  widgetId,
  metadata,
}) {
  const normalizedTenantId = String(tenantId ?? "").trim() || "0";
  const normalizedUserId = String(userId ?? "").trim() || resolvePlatformDashboardUserId();
  const normalizedWidgetId = String(widgetId ?? "").trim() || "platform-dashboard";
  const normalizedScope = String(selectedScope ?? "").trim() || normalizedWidgetId;
  const normalizedMetadata = {};

  if (metadata && typeof metadata === "object") {
    for (const [key, value] of Object.entries(metadata)) {
      const normalizedValue = String(value ?? "").trim();
      if (normalizedValue) {
        normalizedMetadata[key] = normalizedValue;
      }
    }
  }

  return {
    hostSurface: "dashboard",
    tenantId: normalizedTenantId,
    userId: normalizedUserId,
    sessionId: getPlatformDashboardSessionId(),
    timestamp: new Date().toISOString(),
    dashboardId: "platform_dev",
    selectedScope: normalizedScope,
    widgetId: normalizedWidgetId,
    metadata: normalizedMetadata,
  };
}

export function buildPlatformDashboardMetadata({
  activeTabKey,
  phase,
  dashboardSummary,
}) {
  const metadata = {};

  if (phase) {
    if (phase.title) {
      metadata.activePhase = String(phase.title);
    }
    if (phase.readiness != null && !Number.isNaN(phase.readiness)) {
      metadata.readiness = `${phase.readiness}%`;
    }
    if (phase.description) {
      metadata.activePhaseDescription = String(phase.description).slice(0, 500);
    }

    const currentTasks = Array.isArray(phase.current_tasks) ? phase.current_tasks : [];
    if (currentTasks.length > 0) {
      metadata.currentWorkItem = String(currentTasks[0]);
      metadata.currentWorkItems = currentTasks.map(String).join("|");
    }

    const completedItems = Array.isArray(phase.completed_items) ? phase.completed_items : [];
    if (completedItems.length > 0) {
      metadata.completedWorkItems = completedItems.map(String).join("|");
    }

    const nextTasks = Array.isArray(phase.next_tasks) ? phase.next_tasks : [];
    if (nextTasks.length > 0) {
      metadata.nextWorkItems = nextTasks.map(String).join("|");
    }

    const embeddedTracks = Array.isArray(phase.embedded_ai_tracks) ? phase.embedded_ai_tracks : [];
    const yasiiTrack = embeddedTracks.find((track) => track.slug === "yasii");
    if (yasiiTrack) {
      if (yasiiTrack.readiness != null && !Number.isNaN(yasiiTrack.readiness)) {
        metadata.yasiiReadiness = `${yasiiTrack.readiness}%`;
      }
      if (Array.isArray(yasiiTrack.current_tasks) && yasiiTrack.current_tasks.length > 0) {
        if (!metadata.currentWorkItem) {
          metadata.currentWorkItem = String(yasiiTrack.current_tasks[0]);
        }
        if (!metadata.currentWorkItems) {
          metadata.currentWorkItems = yasiiTrack.current_tasks.map(String).join("|");
        }
      }
      if (Array.isArray(yasiiTrack.next_tasks) && yasiiTrack.next_tasks.length > 0 && !metadata.nextWorkItems) {
        metadata.nextWorkItems = yasiiTrack.next_tasks.map(String).join("|");
      }
    }

    const aceTrack = embeddedTracks.find((track) => track.slug === "ace");
    if (aceTrack?.readiness != null && !Number.isNaN(aceTrack.readiness)) {
      metadata.aceReadiness = `${aceTrack.readiness}%`;
    }
  }

  if (activeTabKey) {
    metadata.dashboardTab = String(activeTabKey);
  }

  if (dashboardSummary?.overall_readiness != null && !Number.isNaN(dashboardSummary.overall_readiness)) {
    metadata.containerReadiness = `${dashboardSummary.overall_readiness}%`;
  }

  return metadata;
}

export function buildPlatformDashboardScopeKey({ widgetId, selectedScope }) {
  return `${String(widgetId ?? "")}:${String(selectedScope ?? "")}`;
}
