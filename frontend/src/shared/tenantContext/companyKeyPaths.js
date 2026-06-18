export const RESERVED_COMPANY_KEY_SEGMENTS = new Set([
  "login",
  "designer",
  "portal",
  "control-plane",
  "yasii",
  "onlyoffice-test",
  "dev",
  "tasks",
  "admin",
  "api",
  "static",
  "assets",
  "favicon.ico",
]);

export function normalizeCompanyKey(value) {
  return String(value || "").trim().toLowerCase();
}

export function isReservedCompanyKeySegment(segment) {
  return RESERVED_COMPANY_KEY_SEGMENTS.has(normalizeCompanyKey(segment));
}

export function buildCompanyEntryPath(companyKey) {
  const normalized = normalizeCompanyKey(companyKey);
  if (!normalized) {
    return "/login";
  }
  return `/${normalized}`;
}
