import { runtimeFetch } from "../../api/runtimeFetch.js";

export function getRuntimeModuleConfiguration(tenantId, moduleKey) {
  return runtimeFetch(
    `/runtime/tenants/${tenantId}/modules/${encodeURIComponent(moduleKey)}/configuration`,
  );
}
