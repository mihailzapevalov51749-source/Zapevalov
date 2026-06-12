function normalizeTenantId(tenantId) {
  const normalized = Number(tenantId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

export function resolveWorkspaceTabTenantId(tab) {
  const explicitTenantId = normalizeTenantId(tab?.tenant_id ?? tab?.tenantId);
  if (explicitTenantId) {
    return explicitTenantId;
  }

  const route = String(tab?.route || "").trim();
  if (!route) {
    return null;
  }

  const portalMatch = route.match(/^\/portal\/(\d+)(?:\/|$)/);
  if (portalMatch?.[1]) {
    return normalizeTenantId(portalMatch[1]);
  }

  const designerMatch = route.match(/^\/designer\/tenant\/(\d+)(?:\/|$)/);
  if (designerMatch?.[1]) {
    return normalizeTenantId(designerMatch[1]);
  }

  return null;
}

export function filterWorkspaceTabsForTenant(tabs = [], tenantId = null) {
  const source = Array.isArray(tabs) ? tabs : [];
  const normalizedTenantId = normalizeTenantId(tenantId);

  if (!normalizedTenantId) {
    return source.filter((tab) => resolveWorkspaceTabTenantId(tab) == null);
  }

  return source.filter(
    (tab) => resolveWorkspaceTabTenantId(tab) === normalizedTenantId,
  );
}
