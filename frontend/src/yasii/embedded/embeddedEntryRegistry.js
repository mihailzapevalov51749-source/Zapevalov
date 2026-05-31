/** @typedef {import('./embeddedSurfaceTypes.js').EMBEDDED_SURFACE_IDS} EmbeddedSurfaceIds */

/**
 * @typedef {Object} EmbeddedSurfaceConfig
 * @property {string} surfaceId
 * @property {string} surfaceName
 * @property {(contextData: Record<string, unknown>) => Record<string, unknown>} buildHostContext
 * @property {(contextData?: Record<string, unknown>) => string} [buildScopeKey]
 * @property {string} defaultRole
 * @property {string} contextLabel
 * @property {string} [welcomeMessage]
 * @property {boolean} [enabled]
 * @property {boolean} [stubOnly]
 */

/** @type {Map<string, EmbeddedSurfaceConfig>} */
const embeddedSurfaceRegistry = new Map();

export function registerEmbeddedSurface(config) {
  if (!config?.surfaceId) {
    throw new Error("Embedded surface requires surfaceId");
  }

  embeddedSurfaceRegistry.set(config.surfaceId, {
    enabled: true,
    stubOnly: false,
    ...config,
  });

  return config;
}

export function resolveEmbeddedSurface(surfaceId) {
  const normalized = String(surfaceId ?? "").trim();
  const config = embeddedSurfaceRegistry.get(normalized);

  if (!config) {
    throw new Error(`Unknown embedded surface: ${normalized || "<empty>"}`);
  }

  return config;
}

export function getEmbeddedSurfaceConfig(surfaceId) {
  const normalized = String(surfaceId ?? "").trim();
  return embeddedSurfaceRegistry.get(normalized) ?? null;
}

export function getAvailableEmbeddedSurfaces() {
  return Array.from(embeddedSurfaceRegistry.values())
    .filter((surface) => surface.enabled !== false)
    .map((surface) => ({
      surfaceId: surface.surfaceId,
      surfaceName: surface.surfaceName,
      defaultRole: surface.defaultRole,
      contextLabel: surface.contextLabel,
      stubOnly: Boolean(surface.stubOnly),
    }));
}

export function getRegisteredEmbeddedSurfaceIds() {
  return Array.from(embeddedSurfaceRegistry.keys());
}
