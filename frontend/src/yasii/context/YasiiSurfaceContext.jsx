import { createContext, useContext, useEffect, useId } from "react";

import { clearYasiiSurface, publishYasiiSurface } from "./yasiiSurfaceBridge.js";

const YasiiSurfaceContext = createContext(null);

export function YasiiSurfaceContextProvider({ value, children }) {
  const publisherToken = useId();

  useEffect(() => {
    if (value?.surfaceId) {
      publishYasiiSurface(value, publisherToken);
    } else {
      clearYasiiSurface(publisherToken);
    }

    return () => {
      clearYasiiSurface(publisherToken);
    };
  }, [publisherToken, value]);

  return (
    <YasiiSurfaceContext.Provider value={value}>
      {children}
    </YasiiSurfaceContext.Provider>
  );
}

export function useYasiiSurfaceContext() {
  return useContext(YasiiSurfaceContext);
}
