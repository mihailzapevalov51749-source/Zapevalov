/** Canonical platform release contours (singleton slots). */
export const CONTOUR_ENVIRONMENT_KEYS = ["DEV", "TEMPLATE"];

const CONTOUR_LABELS = {
  DEV: "DEV",
  TEMPLATE: "Template",
};

function normalizeEnvironmentKey(value) {
  return String(value || "").trim().toUpperCase();
}

function compareByTenantName(left, right) {
  const leftName = String(left?.tenant_name || "").toLocaleLowerCase("ru");
  const rightName = String(right?.tenant_name || "").toLocaleLowerCase("ru");
  if (leftName !== rightName) {
    return leftName.localeCompare(rightName, "ru");
  }
  return Number(left?.tenant_id || 0) - Number(right?.tenant_id || 0);
}

/**
 * Split registry current_versions into contour slots (DEV/Template) and client fleet.
 * Source of truth remains platform_environment_versions; this is a view-model only.
 */
export function partitionVersionRegistryRows(rows) {
  const normalized = Array.isArray(rows) ? rows : [];
  const contourByKey = new Map();
  const clientRows = [];

  for (const row of normalized) {
    const environmentKey = normalizeEnvironmentKey(row?.environment_key);
    if (environmentKey === "CLIENT") {
      clientRows.push(row);
      continue;
    }
    if (CONTOUR_ENVIRONMENT_KEYS.includes(environmentKey) && !contourByKey.has(environmentKey)) {
      contourByKey.set(environmentKey, row);
    }
  }

  const contourSlots = CONTOUR_ENVIRONMENT_KEYS.map((key) => ({
    key,
    label: CONTOUR_LABELS[key] || key,
    row: contourByKey.get(key) || null,
  }));

  const sortedClientRows = [...clientRows].sort(compareByTenantName);
  const templateRow = contourByKey.get("TEMPLATE");

  return {
    contourSlots,
    clientRows: sortedClientRows,
    templateVersion: templateRow?.platform_version || null,
  };
}
