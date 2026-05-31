import { createContext, useContext } from "react";

const YasiiSurfaceContext = createContext(null);

export function YasiiSurfaceContextProvider({ value, children }) {
  return (
    <YasiiSurfaceContext.Provider value={value}>
      {children}
    </YasiiSurfaceContext.Provider>
  );
}

export function useYasiiSurfaceContext() {
  return useContext(YasiiSurfaceContext);
}
