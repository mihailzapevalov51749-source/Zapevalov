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

function splitFullName(fullName) {
  const text = String(fullName ?? "").trim();
  if (!text) {
    return { firstName: "", lastName: "" };
  }
  const parts = text.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function buildUserIdentityFromCurrentUser(userOverride) {
  const user = userOverride ?? getStoredCurrentUser();
  if (!user || typeof user !== "object") {
    return null;
  }

  const userId = String(user.id ?? user.user_id ?? user.userId ?? "").trim();
  if (!userId) {
    return null;
  }

  const fullName = String(user.full_name ?? user.fullName ?? user.displayName ?? "").trim();
  const explicitFirst = String(user.firstName ?? user.first_name ?? "").trim();
  const explicitLast = String(user.lastName ?? user.last_name ?? "").trim();
  const split = splitFullName(fullName);
  const firstName = explicitFirst || split.firstName;
  const lastName = explicitLast || split.lastName;
  const displayName = fullName || [firstName, lastName].filter(Boolean).join(" ").trim();

  const roles = [];
  const roleName = String(user.role ?? user.role_name ?? user.roleName ?? "").trim();
  if (roleName) {
    roles.push(roleName);
  }
  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      const normalized = String(role ?? "").trim();
      if (normalized && !roles.includes(normalized)) {
        roles.push(normalized);
      }
    }
  }

  const identity = {
    userId,
    displayName: displayName || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: String(user.email ?? "").trim() || undefined,
    position: String(user.position ?? "").trim() || undefined,
    department: String(user.department ?? "").trim() || undefined,
    roles,
    avatarUrl: String(user.avatar_url ?? user.avatarUrl ?? "").trim() || undefined,
  };

  return Object.fromEntries(
    Object.entries(identity).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value != null && String(value).trim() !== "";
    }),
  );
}

export function attachUserIdentity(hostContext, userOverride) {
  const userIdentity = buildUserIdentityFromCurrentUser(userOverride);
  if (!userIdentity) {
    return hostContext;
  }
  return {
    ...hostContext,
    userIdentity,
  };
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

  return attachUserIdentity({
    hostSurface: "dashboard",
    tenantId: normalizedTenantId,
    userId: normalizedUserId,
    sessionId: getPlatformDashboardSessionId(),
    timestamp: new Date().toISOString(),
    dashboardId: "platform_dev",
    selectedScope: normalizedScope,
    widgetId: normalizedWidgetId,
    metadata: normalizedMetadata,
  });
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

function normalizeMetadata(metadata) {
  const normalizedMetadata = {};

  if (metadata && typeof metadata === "object") {
    for (const [key, value] of Object.entries(metadata)) {
      const normalizedValue = String(value ?? "").trim();
      if (normalizedValue) {
        normalizedMetadata[key] = normalizedValue;
      }
    }
  }

  return normalizedMetadata;
}

export function buildObjectCardHostContext({
  tenantId,
  userId,
  objectTypeId,
  objectTypeName,
  objectId,
  objectTitle,
  activeTab,
  selectedScope,
  metadata,
}) {
  const normalizedTenantId = String(tenantId ?? "").trim() || "0";
  const normalizedUserId = String(userId ?? "").trim() || resolvePlatformDashboardUserId();
  const normalizedObjectTypeId = String(objectTypeId ?? "").trim();
  const normalizedObjectTypeName = String(objectTypeName ?? "").trim() || "Объект";
  const normalizedObjectId = String(objectId ?? "").trim();
  const normalizedObjectTitle = String(objectTitle ?? "").trim() || "Без названия";
  const normalizedActiveTab = String(activeTab ?? "").trim() || "main";
  const normalizedWidgetId = `object-card-${normalizedActiveTab}`;
  const normalizedScope =
    String(selectedScope ?? "").trim()
    || `object-card:${normalizedObjectTypeId || normalizedObjectTypeName}:${normalizedObjectId || "new"}:${normalizedActiveTab}`;
  const normalizedMetadata = normalizeMetadata(metadata);

  return {
    hostSurface: "object_card",
    tenantId: normalizedTenantId,
    userId: normalizedUserId,
    sessionId: getPlatformDashboardSessionId(),
    timestamp: new Date().toISOString(),
    objectTypeId: normalizedObjectTypeId,
    objectTypeName: normalizedObjectTypeName,
    objectId: normalizedObjectId,
    objectTitle: normalizedObjectTitle,
    activeTab: normalizedActiveTab,
    selectedScope: normalizedScope,
    widgetId: normalizedWidgetId,
    metadata: {
      ...normalizedMetadata,
      objectTypeId: normalizedObjectTypeId,
      objectTypeName: normalizedObjectTypeName,
      objectId: normalizedObjectId,
      objectTitle: normalizedObjectTitle,
      activeTab: normalizedActiveTab,
    },
  };
}

export function buildObjectCardScopeKey({
  objectTypeId,
  objectTypeName,
  objectId,
  activeTab,
  selectedScope,
}) {
  const normalizedObjectType = String(objectTypeId ?? objectTypeName ?? "").trim() || "object";
  const normalizedObjectId = String(objectId ?? "").trim() || "new";
  const normalizedTab = String(activeTab ?? "").trim() || "main";
  const normalizedScope = String(selectedScope ?? "").trim() || `${normalizedObjectType}:${normalizedObjectId}:${normalizedTab}`;
  return `${normalizedScope}:${normalizedTab}`;
}

const FILTER_OPERATOR_LABELS = {
  eq: "равно",
  in: "в списке",
};

function formatRegistryFilterValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
  }

  return String(value ?? "").trim();
}

export function formatRegistryFilterConditions(conditions = [], fieldLabels = {}) {
  const normalized = Array.isArray(conditions) ? conditions : [];

  return normalized
    .map((condition) => {
      const fieldKey = String(condition?.fieldKey ?? "").trim();
      if (!fieldKey) {
        return "";
      }

      const fieldLabel = String(fieldLabels[fieldKey] ?? fieldKey).trim() || fieldKey;
      const operator = String(condition?.operator ?? "eq").trim().toLowerCase();
      const operatorLabel = FILTER_OPERATOR_LABELS[operator] || operator;
      const valueText = formatRegistryFilterValue(condition?.value);

      if (!valueText) {
        return `${fieldLabel} ${operatorLabel}`;
      }

      return `${fieldLabel} ${operatorLabel} ${valueText}`;
    })
    .filter(Boolean);
}

export function formatRegistrySortRules(rules = [], fieldLabels = {}) {
  const normalized = Array.isArray(rules) ? rules : [];

  return normalized
    .map((rule) => {
      const fieldKey = String(rule?.field ?? "").trim();
      if (!fieldKey) {
        return "";
      }

      const fieldLabel = String(fieldLabels[fieldKey] ?? fieldKey).trim() || fieldKey;
      const order = String(rule?.order ?? "asc").trim().toUpperCase();
      return `${fieldLabel} ${order}`;
    })
    .filter(Boolean);
}

export function buildRegistryHostContext({
  tenantId,
  userId,
  registryId,
  registryName,
  viewId,
  viewName,
  selectedCount = 0,
  activeFilters = "",
  activeSorts = "",
  searchQuery = "",
  selectedScope,
  metadata,
}) {
  const normalizedTenantId = String(tenantId ?? "").trim() || "0";
  const normalizedUserId = String(userId ?? "").trim() || resolvePlatformDashboardUserId();
  const normalizedRegistryId = String(registryId ?? "").trim();
  const normalizedRegistryName = String(registryName ?? "").trim() || "Реестр";
  const normalizedViewId = String(viewId ?? "").trim() || "default";
  const normalizedViewName = String(viewName ?? "").trim() || "Таблица";
  const normalizedSelectedCount = Number.isFinite(Number(selectedCount))
    ? Math.max(0, Math.trunc(Number(selectedCount)))
    : 0;
  const normalizedActiveFilters = String(activeFilters ?? "").trim() || "нет активных фильтров";
  const normalizedActiveSorts = String(activeSorts ?? "").trim() || "сортировка не задана";
  const normalizedSearchQuery = String(searchQuery ?? "").trim();
  const normalizedWidgetId = `registry-${normalizedRegistryId || "unknown"}-${normalizedViewId}`;
  const normalizedScope =
    String(selectedScope ?? "").trim()
    || `registry:${normalizedRegistryId || normalizedRegistryName}:${normalizedViewId}`;
  const normalizedMetadata = normalizeMetadata(metadata);

  return attachUserIdentity({
    hostSurface: "registry",
    tenantId: normalizedTenantId,
    userId: normalizedUserId,
    sessionId: getPlatformDashboardSessionId(),
    timestamp: new Date().toISOString(),
    registryId: normalizedRegistryId,
    registryName: normalizedRegistryName,
    viewId: normalizedViewId,
    viewName: normalizedViewName,
    selectedCount: String(normalizedSelectedCount),
    activeFilters: normalizedActiveFilters,
    activeSorts: normalizedActiveSorts,
    searchQuery: normalizedSearchQuery,
    selectedScope: normalizedScope,
    widgetId: normalizedWidgetId,
    metadata: {
      ...normalizedMetadata,
      registryId: normalizedRegistryId,
      registryName: normalizedRegistryName,
      viewId: normalizedViewId,
      viewName: normalizedViewName,
      selectedCount: String(normalizedSelectedCount),
      activeFilters: normalizedActiveFilters,
      activeSorts: normalizedActiveSorts,
      searchQuery: normalizedSearchQuery,
    },
  });
}

export function buildRegistryScopeKey({
  registryId,
  viewId,
  selectedScope,
  activeFilters,
  activeSorts,
  searchQuery,
}) {
  const normalizedRegistry = String(registryId ?? "").trim() || "registry";
  const normalizedView = String(viewId ?? "").trim() || "default";
  const normalizedScope = String(selectedScope ?? "").trim() || `${normalizedRegistry}:${normalizedView}`;
  const filterKey = String(activeFilters ?? "").trim();
  const sortKey = String(activeSorts ?? "").trim();
  const searchKey = String(searchQuery ?? "").trim();
  return `${normalizedScope}:${filterKey}:${sortKey}:${searchKey}`;
}

export function buildDesignerHostContext({
  tenantId,
  userId,
  designerArea,
  designerEntityType,
  designerEntityId,
  designerEntityName,
  selectedNodeId,
  selectedNodeName,
  selectedScope,
  metadata,
}) {
  const normalizedTenantId = String(tenantId ?? "").trim() || "0";
  const normalizedUserId = String(userId ?? "").trim() || resolvePlatformDashboardUserId();
  const normalizedArea = String(designerArea ?? "").trim() || "Студия";
  const normalizedEntityType = String(designerEntityType ?? "").trim() || "designer";
  const normalizedEntityId = String(designerEntityId ?? "").trim() || normalizedEntityType;
  const normalizedEntityName = String(designerEntityName ?? "").trim() || normalizedArea;
  const normalizedNodeId = String(selectedNodeId ?? "").trim() || normalizedEntityId;
  const normalizedNodeName = String(selectedNodeName ?? "").trim() || normalizedEntityName;
  const normalizedWidgetId = `designer-${normalizedEntityType}-${normalizedEntityId}`;
  const normalizedScope =
    String(selectedScope ?? "").trim()
    || `designer:${normalizedEntityType}:${normalizedEntityId}:${normalizedNodeId}`;
  const normalizedMetadata = normalizeMetadata(metadata);

  return attachUserIdentity({
    hostSurface: "designer",
    tenantId: normalizedTenantId,
    userId: normalizedUserId,
    sessionId: getPlatformDashboardSessionId(),
    timestamp: new Date().toISOString(),
    designerArea: normalizedArea,
    designerEntityType: normalizedEntityType,
    designerEntityId: normalizedEntityId,
    designerEntityName: normalizedEntityName,
    selectedNodeId: normalizedNodeId,
    selectedNodeName: normalizedNodeName,
    selectedScope: normalizedScope,
    widgetId: normalizedWidgetId,
    metadata: {
      ...normalizedMetadata,
      designerArea: normalizedArea,
      designerEntityType: normalizedEntityType,
      designerEntityId: normalizedEntityId,
      designerEntityName: normalizedEntityName,
      designerMode: normalizedMetadata.designerMode || "designer",
      designerPath: normalizedMetadata.designerPath || "",
      designerSection: normalizedMetadata.designerSection || normalizedArea,
    },
  });
}

export function buildDesignerScopeKey({
  designerEntityType,
  designerEntityId,
  selectedNodeId,
  selectedScope,
  metadata,
}) {
  const entityType = String(designerEntityType ?? "").trim() || "designer";
  const entityId = String(designerEntityId ?? "").trim() || entityType;
  const nodeId = String(selectedNodeId ?? "").trim() || entityId;
  const scope = String(selectedScope ?? "").trim() || `designer:${entityType}:${entityId}`;
  const section = String(metadata?.designerSection ?? "").trim();
  const path = String(metadata?.designerPath ?? "").trim();
  return `${scope}:${nodeId}:${section}:${path}`;
}

export function buildDocumentHostContext({
  tenantId,
  userId,
  documentId,
  documentName,
  documentType,
  documentLibraryId,
  documentLibraryName,
  selectedScope,
  metadata,
}) {
  const normalizedTenantId = String(tenantId ?? "").trim() || "0";
  const normalizedUserId = String(userId ?? "").trim() || resolvePlatformDashboardUserId();
  const normalizedDocumentId = String(documentId ?? "").trim();
  const normalizedDocumentName = String(documentName ?? "").trim() || "Документ";
  const normalizedDocumentType = String(documentType ?? "").trim() || "ФАЙЛ";
  const normalizedLibraryId = String(documentLibraryId ?? "").trim();
  const normalizedLibraryName = String(documentLibraryName ?? "").trim() || "Библиотека документов";
  const normalizedWidgetId = `document-${normalizedDocumentId || "unknown"}`;
  const normalizedScope =
    String(selectedScope ?? "").trim()
    || `document:${normalizedLibraryId || "library"}:${normalizedDocumentId || "unknown"}`;
  const normalizedMetadata = normalizeMetadata(metadata);

  return attachUserIdentity({
    hostSurface: "document",
    tenantId: normalizedTenantId,
    userId: normalizedUserId,
    sessionId: getPlatformDashboardSessionId(),
    timestamp: new Date().toISOString(),
    documentId: normalizedDocumentId,
    documentName: normalizedDocumentName,
    documentType: normalizedDocumentType,
    documentLibraryId: normalizedLibraryId,
    documentLibraryName: normalizedLibraryName,
    selectedScope: normalizedScope,
    widgetId: normalizedWidgetId,
    metadata: {
      ...normalizedMetadata,
      documentId: normalizedDocumentId,
      documentName: normalizedDocumentName,
      documentType: normalizedDocumentType,
      documentLibraryId: normalizedLibraryId,
      documentLibraryName: normalizedLibraryName,
    },
  });
}

export function buildDocumentScopeKey({
  documentId,
  documentLibraryId,
  selectedScope,
  metadata,
}) {
  const libraryId = String(documentLibraryId ?? "").trim() || "library";
  const docId = String(documentId ?? "").trim() || "document";
  const scope = String(selectedScope ?? "").trim() || `document:${libraryId}:${docId}`;
  const extension = String(metadata?.fileExtension ?? "").trim();
  const viewerType = String(metadata?.viewerType ?? "").trim();
  return `${scope}:${extension}:${viewerType}`;
}

export function buildProcessHostContext({
  tenantId,
  userId,
  processId,
  processName,
  processType,
  processStatus,
  activeStepId,
  activeStepName,
  selectedScope,
  metadata,
}) {
  const normalizedTenantId = String(tenantId ?? "").trim() || "0";
  const normalizedUserId = String(userId ?? "").trim() || resolvePlatformDashboardUserId();
  const normalizedProcessId = String(processId ?? "").trim();
  const normalizedProcessName = String(processName ?? "").trim();
  const normalizedProcessType = String(processType ?? "").trim() || "workflow";
  const normalizedProcessStatus = String(processStatus ?? "").trim() || "unknown";
  const normalizedStepId = String(activeStepId ?? "").trim();
  const normalizedStepName = String(activeStepName ?? "").trim();
  const normalizedWidgetId = normalizedProcessId
    ? `process-${normalizedProcessId}`
    : "process-integration";
  const normalizedScope =
    String(selectedScope ?? "").trim()
    || (normalizedProcessId
      ? `process:${normalizedProcessId}:${normalizedStepId || "step"}`
      : "process:integration-ready");
  const normalizedMetadata = normalizeMetadata(metadata);

  return attachUserIdentity({
    hostSurface: "process",
    tenantId: normalizedTenantId,
    userId: normalizedUserId,
    sessionId: getPlatformDashboardSessionId(),
    timestamp: new Date().toISOString(),
    processId: normalizedProcessId,
    processName: normalizedProcessName,
    processType: normalizedProcessType,
    processStatus: normalizedProcessStatus,
    activeStepId: normalizedStepId,
    activeStepName: normalizedStepName,
    selectedScope: normalizedScope,
    widgetId: normalizedWidgetId,
    metadata: {
      ...normalizedMetadata,
      processId: normalizedProcessId,
      processName: normalizedProcessName,
      processType: normalizedProcessType,
      processStatus: normalizedProcessStatus,
      activeStepId: normalizedStepId,
      activeStepName: normalizedStepName,
      processVersion: normalizedMetadata.processVersion || "",
      processPath: normalizedMetadata.processPath || "",
      processOwner: normalizedMetadata.processOwner || "",
    },
  });
}

export function buildProcessScopeKey({
  processId,
  activeStepId,
  selectedScope,
  metadata,
}) {
  const normalizedProcessId = String(processId ?? "").trim() || "process";
  const normalizedStepId = String(activeStepId ?? "").trim() || "step";
  const scope = String(selectedScope ?? "").trim() || `process:${normalizedProcessId}`;
  const version = String(metadata?.processVersion ?? "").trim();
  const path = String(metadata?.processPath ?? "").trim();
  return `${scope}:${normalizedStepId}:${version}:${path}`;
}
