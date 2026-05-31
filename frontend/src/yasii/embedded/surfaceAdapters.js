import {
  buildPlatformDashboardHostContext,
  buildPlatformDashboardScopeKey,
  resolvePlatformDashboardUserId,
} from "../hostContextBuilders.js";
import { buildEmbeddedScopeKey } from "./embeddedScopeKey.js";
import { EMBEDDED_SURFACE_IDS } from "./embeddedSurfaceTypes.js";
import { registerEmbeddedSurface } from "./embeddedEntryRegistry.js";

function createStubHostContext(hostSurface, contextData = {}) {
  const tenantId = String(contextData.tenantId ?? "0");
  const userId = String(contextData.userId ?? resolvePlatformDashboardUserId());

  return {
    hostSurface,
    tenantId,
    userId,
    sessionId: `stub-${hostSurface}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    selectedScope: String(contextData.selectedScope ?? "stub"),
    widgetId: String(contextData.widgetId ?? hostSurface),
    _stubOnly: true,
  };
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
  return createStubHostContext("object_card", contextData);
}

export function buildRegistryContext(contextData = {}) {
  return createStubHostContext("registry", contextData);
}

export function buildDesignerContext(contextData = {}) {
  return createStubHostContext("designer", contextData);
}

export function buildDocumentContext(contextData = {}) {
  return createStubHostContext("document", contextData);
}

export function buildProcessContext(contextData = {}) {
  return createStubHostContext("process", contextData);
}

function registerDefaultEmbeddedSurfaces() {
  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.DASHBOARD,
    surfaceName: "Platform Dashboard",
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
    surfaceName: "Object Card",
    buildHostContext: buildObjectCardContext,
    buildScopeKey: (contextData) =>
      buildEmbeddedScopeKey(EMBEDDED_SURFACE_IDS.OBJECT_CARD, contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Object Card",
    enabled: false,
    stubOnly: true,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
    surfaceName: "Registry",
    buildHostContext: buildRegistryContext,
    buildScopeKey: (contextData) =>
      buildEmbeddedScopeKey(EMBEDDED_SURFACE_IDS.REGISTRY, contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Registry",
    enabled: false,
    stubOnly: true,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.DESIGNER,
    surfaceName: "Designer",
    buildHostContext: buildDesignerContext,
    buildScopeKey: (contextData) =>
      buildEmbeddedScopeKey(EMBEDDED_SURFACE_IDS.DESIGNER, contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Designer",
    enabled: false,
    stubOnly: true,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.DOCUMENT,
    surfaceName: "Document",
    buildHostContext: buildDocumentContext,
    buildScopeKey: (contextData) =>
      buildEmbeddedScopeKey(EMBEDDED_SURFACE_IDS.DOCUMENT, contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Document",
    enabled: false,
    stubOnly: true,
  });

  registerEmbeddedSurface({
    surfaceId: EMBEDDED_SURFACE_IDS.PROCESS,
    surfaceName: "Process",
    buildHostContext: buildProcessContext,
    buildScopeKey: (contextData) =>
      buildEmbeddedScopeKey(EMBEDDED_SURFACE_IDS.PROCESS, contextData),
    defaultRole: "yasii-developer",
    contextLabel: "Process",
    enabled: false,
    stubOnly: true,
  });
}

registerDefaultEmbeddedSurfaces();
