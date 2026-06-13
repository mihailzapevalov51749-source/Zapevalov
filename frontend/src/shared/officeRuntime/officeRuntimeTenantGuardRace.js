export function normalizeOfficeRuntimePortalId(portalId) {
  const normalized = Number(portalId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

export function beginOfficeRuntimeGuardRequest(requestSeqRef) {
  requestSeqRef.current += 1;
  return {
    requestId: requestSeqRef.current,
  };
}

export function isStaleOfficeRuntimeGuardResponse({
  requestId,
  requestSeqRef,
  requestPortalId,
  currentPortalId,
}) {
  if (requestId !== requestSeqRef.current) {
    return true;
  }

  return (
    normalizeOfficeRuntimePortalId(requestPortalId) !==
    normalizeOfficeRuntimePortalId(currentPortalId)
  );
}
