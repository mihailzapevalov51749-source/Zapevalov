import {
  buildDesignerHostContext,
  buildDesignerScopeKey,
  buildDocumentHostContext,
  buildDocumentScopeKey,
  buildProcessHostContext,
  buildProcessScopeKey,
  buildObjectCardHostContext,
  buildObjectCardScopeKey,
  attachUserIdentity,
  buildPlatformDashboardHostContext,
  buildPlatformDashboardScopeKey,
  buildRegistryHostContext,
  buildRegistryScopeKey,
  resolvePlatformDashboardUserId,
} from "../hostContextBuilders.js";
import { buildEmbeddedScopeKey } from "./embeddedScopeKey.js";
import { EMBEDDED_SURFACE_IDS } from "./embeddedSurfaceTypes.js";
import { registerEmbeddedSurface } from "./embeddedEntryRegistry.js";

function createStubHostContext(hostSurface, contextData = {}) {
  const tenantId = String(contextData.tenantId ?? "0");
  const userId = String(contextData.userId ?? resolvePlatformDashboardUserId());

  return attachUserIdentity({
    hostSurface,
    tenantId,
    userId,
    sessionId: `stub-${hostSurface}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    selectedScope: String(contextData.selectedScope ?? "stub"),
    widgetId: String(contextData.widgetId ?? hostSurface),
    _stubOnly: true,
  });
}

export function buildDashboardContext(contextData = {}) {
  return buildPlatformDashboardHostContext({
    tenantId: contextData.tenantId,
    userId: contextData.userId,
    selectedScope: contextData.selectedScope,
    widgetId: contextData.widgetId,
    metadata: contextData.metadata,
  });
}

export function buildGlobalContext(contextData = {}) {
  return buildPlatformDashboardHostContext({
    tenantId: contextData.tenantId ?? "0",
    userId: contextData.userId ?? resolvePlatformDashboardUserId(),
    selectedScope: contextData.selectedScope ?? "global-entry",
    widgetId: contextData.widgetId ?? "global-entry",
  });
}

export function buildObjectCardContext(contextData = {}) {
  return buildObjectCardHostContext({
    tenantId: contextData.tenantId,
    userId: contextData.userId,
    objectTypeId: contextData.objectTypeId,
    objectTypeName: contextData.objectTypeName,
    objectId: contextData.objectId,
    objectTitle: contextData.objectTitle,
    activeTab: contextData.activeTab,
    selectedScope: contextData.selectedScope,
    metadata: contextData.metadata,
  });
}

export function buildRegistryContext(contextData = {}) {
  return buildRegistryHostContext({
    tenantId: contextData.tenantId,
    userId: contextData.userId,
    registryId: contextData.registryId,
    registryName: contextData.registryName,
    viewId: contextData.viewId,
    viewName: contextData.viewName,
    selectedCount: contextData.selectedCount,
    activeFilters: contextData.activeFilters,
    activeSorts: contextData.activeSorts,
    searchQuery: contextData.searchQuery,
    selectedScope: contextData.selectedScope,
    metadata: contextData.metadata,
  });
}

export function buildDesignerContext(contextData = {}) {
  return buildDesignerHostContext({
    tenantId: contextData.tenantId,
    userId: contextData.userId,
    designerArea: contextData.designerArea,
    designerEntityType: contextData.designerEntityType,
    designerEntityId: contextData.designerEntityId,
    designerEntityName: contextData.designerEntityName,
    selectedNodeId: contextData.selectedNodeId,
    selectedNodeName: contextData.selectedNodeName,
    selectedScope: contextData.selectedScope,
    metadata: contextData.metadata,
  });
}

export function buildDocumentContext(contextData = {}) {
  return buildDocumentHostContext({
    tenantId: contextData.tenantId,
    userId: contextData.userId,
    documentId: contextData.documentId,
    documentName: contextData.documentName,
    documentType: contextData.documentType,
    documentLibraryId: contextData.documentLibraryId,
    documentLibraryName: contextData.documentLibraryName,
    selectedScope: contextData.selectedScope,
    metadata: contextData.metadata,
  });
}

export function buildProcessContext(contextData = {}) {
  return buildProcessHostContext({
    tenantId: contextData.tenantId,
    userId: contextData.userId,
    processId: contextData.processId,
    processName: contextData.processName,
    processType: contextData.processType,
    processStatus: contextData.processStatus,
    activeStepId: contextData.activeStepId,
    activeStepName: contextData.activeStepName,
    selectedScope: contextData.selectedScope,
    metadata: contextData.metadata,
  });
}

function registerDefaultEmbeddedSurfaces() {
  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.DASHBOARD,
    surfaceName: "Dashboard",
    buildHostContext: buildDashboardContext,
    buildScopeKey: (contextData) => buildPlatformDashboardScopeKey(contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Platform Development",
    welcomeMessage:
      "ЯСИИ подключён через Embedded Entry Framework.\nЗадайте вопрос по текущему контексту Platform Dashboard.",
    enabled: true,
    stubOnly: false,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
    surfaceName: "Global Entry Point",
    buildHostContext: buildGlobalContext,
    buildScopeKey: (contextData) =>
      buildEmbeddedScopeKey(EMBEDDED_SURFACE_IDS.GLOBAL, contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Platform",
    welcomeMessage:
      "ЯСИИ — глобальная точка входа платформы.\nКонтекст передаётся через Host Contract и ACE handoff.",
    enabled: true,
    stubOnly: false,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.OBJECT_CARD,
    surfaceName: "Карточка объекта",
    buildHostContext: buildObjectCardContext,
    buildScopeKey: (contextData) => buildObjectCardScopeKey(contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Карточка объекта",
    welcomeMessage:
      "ЯСИИ подключён к карточке объекта.\nЗадайте вопрос о текущем объекте и его контексте.",
    enabled: true,
    stubOnly: false,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
    surfaceName: "Реестр",
    buildHostContext: buildRegistryContext,
    buildScopeKey: (contextData) => buildRegistryScopeKey(contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Реестр данных",
    welcomeMessage:
      "ЯСИИ подключён к реестру.\nЗадайте вопрос о текущем списке, фильтрах и представлении.",
    enabled: true,
    stubOnly: false,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.DESIGNER,
    surfaceName: "Designer",
    buildHostContext: buildDesignerContext,
    buildScopeKey: (contextData) => buildDesignerScopeKey(contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Конструктор",
    welcomeMessage:
      "ЯСИИ подключён к Студии.\nЗадайте вопрос о текущем разделе конструктора и редактируемой сущности.",
    enabled: true,
    stubOnly: false,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.DOCUMENT,
    surfaceName: "Document",
    buildHostContext: buildDocumentContext,
    buildScopeKey: (contextData) => buildDocumentScopeKey(contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Документ",
    welcomeMessage:
      "ЯСИИ подключён к открытому документу.\nЗадайте вопрос о текущем файле и его контексте.",
    enabled: true,
    stubOnly: false,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.PROCESS,
    surfaceName: "Process",
    buildHostContext: buildProcessContext,
    buildScopeKey: (contextData) => buildProcessScopeKey(contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Процесс",
    welcomeMessage:
      "ЯСИИ подключён к процессной поверхности.\nЗадайте вопрос о текущем процессе и активном шаге.",
    enabled: true,
    stubOnly: false,
  });
}

registerDefaultEmbeddedSurfaces();
