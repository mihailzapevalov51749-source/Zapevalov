export const APP_BRAND_BASE = "YasnoPro";

export function resolveTenantBrandTitle(record = null) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const shortName = String(record.short_name || record.shortName || "").trim();
  const name = String(record.name || "").trim();
  return shortName || name || null;
}

export function resolveTenantDisplayName(record = null, fallback = APP_BRAND_BASE) {
  if (!record || typeof record !== "object") {
    return fallback;
  }

  const shortName = String(record.short_name || record.shortName || "").trim();
  const name = String(record.name || "").trim();
  const code = String(record.code || "").trim();
  return shortName || name || code || fallback;
}

export function resolveTenantSidebarBrand(record = null, { subtitle } = {}) {
  const title = resolveTenantBrandTitle(record);
  if (!title) {
    return null;
  }

  return {
    title,
    ...(subtitle ? { subtitle } : {}),
  };
}
