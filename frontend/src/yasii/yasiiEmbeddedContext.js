export const YASII_EMBEDDED_STALE_MS = 10 * 60 * 1000;

export function isEmbeddedHandoffStale({
  createdAt,
  scopeKey,
  currentScopeKey,
  staleAfterMs = YASII_EMBEDDED_STALE_MS,
}) {
  if (!createdAt) {
    return true;
  }

  if (scopeKey && currentScopeKey && scopeKey !== currentScopeKey) {
    return true;
  }

  return Date.now() - createdAt > staleAfterMs;
}
