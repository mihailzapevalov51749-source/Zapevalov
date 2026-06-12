export function normalizeNavigationPortalId(portalId) {
  const normalized = Number(portalId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

export function beginNavigationReloadRequest(requestSeqRef) {
  requestSeqRef.current += 1;
  return {
    requestId: requestSeqRef.current,
  };
}

export function isStaleNavigationReloadResponse({
  requestId,
  requestSeqRef,
  requestPortalId,
  currentPortalId,
}) {
  if (requestId !== requestSeqRef.current) {
    return true;
  }

  return (
    normalizeNavigationPortalId(requestPortalId) !==
    normalizeNavigationPortalId(currentPortalId)
  );
}
