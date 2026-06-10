export const TENANT_ENVIRONMENT_ROLES = {
  DEV: {
    code: "DEV",
    label: "DEV",
    color: "#DC2626",
  },
  TEMPLATE: {
    code: "TEMPLATE",
    label: "TEMPLATE",
    color: "#EA580C",
  },
  DEMO: {
    code: "DEMO",
    label: "DEMO",
    color: "#2563EB",
  },
  CLIENT: {
    code: "CLIENT",
    label: "CLIENT",
    color: "#16A34A",
  },
  LEGACY_TEMPLATE: {
    code: "LEGACY_TEMPLATE",
    label: "OLD TEMPLATE",
    color: "#6B7280",
  },
};

const APP_TITLE_BASE = "YasnoPro";

/** Short browser-tab suffix; display badge labels stay full in sidebar. */
const TENANT_ENVIRONMENT_TITLE_SUFFIX = {
  DEV: "V",
  TEMPLATE: "T",
  DEMO: "D",
  CLIENT: "C",
  LEGACY_TEMPLATE: "O",
};

const LEGACY_TENANT_TYPE_BY_ID = {
  1: "DEV",
  2: "TEMPLATE",
  3: "DEMO",
  13: "LEGACY_TEMPLATE",
};

function normalizeTenantId(tenantId) {
  const id = Number(tenantId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

/**
 * Temporary compatibility when tenant_type is not yet loaded from API.
 * @deprecated Use tenant_type from API as source of truth.
 */
export function resolveTenantEnvironmentTypeFromId(tenantId) {
  const id = normalizeTenantId(tenantId);
  if (id == null) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(LEGACY_TENANT_TYPE_BY_ID, id)) {
    return LEGACY_TENANT_TYPE_BY_ID[id];
  }
  if (id >= 4) {
    return "CLIENT";
  }
  return "CLIENT";
}

export function resolveTenantEnvironmentRoleCode({ tenantId, tenantType } = {}) {
  const normalizedType = String(tenantType || "").trim().toUpperCase();
  if (normalizedType && TENANT_ENVIRONMENT_ROLES[normalizedType]) {
    return normalizedType;
  }
  return resolveTenantEnvironmentTypeFromId(tenantId);
}

/**
 * @param {{ tenantId?: number | string | null, tenantType?: string | null }} input
 * @returns {{ tenantId: number, code: string, label: string, color: string, tenantType: string } | null}
 */
export function resolveTenantEnvironment(input = {}) {
  const tenantId = normalizeTenantId(input.tenantId);
  if (tenantId == null) {
    return null;
  }

  const roleCode = resolveTenantEnvironmentRoleCode({
    tenantId,
    tenantType: input.tenantType,
  });
  const role = TENANT_ENVIRONMENT_ROLES[roleCode];
  if (!role) {
    return null;
  }

  return {
    tenantId,
    tenantType: roleCode,
    code: role.code,
    label: role.label,
    color: role.color,
  };
}

export function resolveTenantEnvironmentTitleSuffix(environment) {
  if (!environment?.tenantType && !environment?.code) {
    return null;
  }
  const key = environment.tenantType || environment.code;
  return TENANT_ENVIRONMENT_TITLE_SUFFIX[key] ?? null;
}

export function buildTenantEnvironmentDocumentTitle(environment) {
  const suffix = resolveTenantEnvironmentTitleSuffix(environment);
  if (!suffix) {
    return APP_TITLE_BASE;
  }
  return `${APP_TITLE_BASE} (${suffix})`;
}

export function applyTenantEnvironmentDocumentTitle(environment) {
  if (typeof document === "undefined") {
    return;
  }
  document.title = buildTenantEnvironmentDocumentTitle(environment);
}
