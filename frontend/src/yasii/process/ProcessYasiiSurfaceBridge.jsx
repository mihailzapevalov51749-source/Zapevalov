import { useMemo } from "react";

import { YasiiSurfaceContextProvider } from "../context/YasiiSurfaceContext.jsx";
import { buildProcessYasiiSurfaceValue } from "./buildProcessContextData.js";

/**
 * Extension point for future process/BPMN screens.
 * Pass `processContext` when a process instance is active; omit to clear the bridge.
 */
export function ProcessYasiiSurfaceBridge({ processContext = null, children }) {
  const surfaceValue = useMemo(
    () => (processContext ? buildProcessYasiiSurfaceValue(processContext) : null),
    [processContext],
  );

  return (
    <YasiiSurfaceContextProvider value={surfaceValue}>
      {children}
    </YasiiSurfaceContextProvider>
  );
}

export default ProcessYasiiSurfaceBridge;
