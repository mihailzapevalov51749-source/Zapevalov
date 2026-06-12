export function normalizeWorkspaceTabTenantId(tenantId) {
  const normalized = Number(tenantId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

export function beginWorkspaceTabsReloadRequest(requestSeqRef) {
  requestSeqRef.current += 1;
  return {
    requestId: requestSeqRef.current,
  };
}

export function isStaleWorkspaceTabsReloadResponse({
  requestId,
  requestSeqRef,
  requestTenantId,
  currentTenantId,
}) {
  if (requestId !== requestSeqRef.current) {
    return true;
  }

  return (
    normalizeWorkspaceTabTenantId(requestTenantId) !==
    normalizeWorkspaceTabTenantId(currentTenantId)
  );
}
