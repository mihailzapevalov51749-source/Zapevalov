import "./styles.css";
import "./embedded/surfaceAdapters.js";

export { default as YasiiLogo } from "../shared/yasii/YasiiLogo";
export { default as YasiiFloatingButton } from "./components/YasiiFloatingButton";
export { default as YasiiLauncher } from "./components/YasiiLauncher";
export { default as YasiiSidePanel } from "./components/YasiiSidePanel";
export { default as YasiiDashboardEmbeddedPanel } from "./components/YasiiDashboardEmbeddedPanel";
export { default as YasiiEmbeddedEntry } from "./components/YasiiEmbeddedEntry";
export { default as YasiiEmbeddedPanel } from "./components/YasiiEmbeddedPanel";
export { default as YasiiEmbeddedContextHeader } from "./components/YasiiEmbeddedContextHeader";
export {
  YasiiSurfaceContextProvider,
  useYasiiSurfaceContext,
} from "./context/YasiiSurfaceContext.jsx";
export { resolveSurfaceFromRoute } from "./embedded/resolveSurfaceFromRoute.js";
export { createAceHandoff, sendEmbeddedQuery } from "./yasiiEmbeddedApi.js";
export {
  buildPlatformDashboardHostContext,
  buildPlatformDashboardMetadata,
  buildObjectCardHostContext,
  buildObjectCardScopeKey,
} from "./hostContextBuilders.js";
export {
  registerEmbeddedSurface,
  resolveEmbeddedSurface,
  getEmbeddedSurfaceConfig,
  getAvailableEmbeddedSurfaces,
} from "./embedded/embeddedEntryRegistry.js";
export { EMBEDDED_SURFACE_IDS } from "./embedded/embeddedSurfaceTypes.js";
