import {
  buildControlPlaneClientsPath,
  buildControlPlaneRoute,
  CONTROL_PLANE_BASE,
} from "../../controlPlane/config/controlPlanePaths.js";
import { buildTenantAdminPath } from "./tenantAdminPaths.js";

export {
  buildControlPlaneClientsPath,
  buildControlPlaneRoute,
  CONTROL_PLANE_BASE,
};

export {
  buildTenantAdminPath,
  resolveStudioTenantIdFromPath,
  isTenantAdministrationPath,
} from "./tenantAdminPaths.js";

export function buildAdministrationPath(tenantId, segment = "") {
  return buildTenantAdminPath(tenantId, segment);
}

export function buildClientsPath(_tenantId, segment = "") {
  const normalizedSegment = String(segment || "").replace(/^\//, "");
  return buildControlPlaneClientsPath(normalizedSegment);
}

export function buildControlPlanePath(_tenantId, segment = "") {
  const normalizedSegment = String(segment || "").replace(/^\//, "");
  if (!normalizedSegment) {
    return buildControlPlaneClientsPath("registry");
  }
  if (normalizedSegment.startsWith("tenants/")) {
    return buildControlPlaneClientsPath(
      `registry/${normalizedSegment.replace(/^tenants\//, "")}`,
    );
  }
  return buildControlPlaneClientsPath(`registry/${normalizedSegment}`);
}
