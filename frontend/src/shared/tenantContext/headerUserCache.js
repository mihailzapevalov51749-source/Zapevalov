export function getHeaderUserCacheKey(tenantId = null) {
  const normalizedTenantId = Number(tenantId);
  if (Number.isFinite(normalizedTenantId) && normalizedTenantId > 0) {
    return `__YASNOPRO_HEADER_USER_CACHE_T${normalizedTenantId}__`;
  }

  return "__YASNOPRO_HEADER_USER_CACHE_GLOBAL__";
}

export function getCachedHeaderUser(tenantId = null) {
  return window[getHeaderUserCacheKey(tenantId)] ?? null;
}

export function setCachedHeaderUser(nextUser, tenantId = null) {
  if (!nextUser) {
    return;
  }

  window[getHeaderUserCacheKey(tenantId)] = nextUser;
}
