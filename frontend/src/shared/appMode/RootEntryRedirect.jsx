import { Navigate } from "react-router-dom";

import { resolveRootEntryPath } from "./appModeNavigation.js";

export default function RootEntryRedirect() {
  return <Navigate to={resolveRootEntryPath()} replace />;
}
