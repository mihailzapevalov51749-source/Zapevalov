import { isTelemetryEnabled } from "../featureFlags/runtimeReadFlags";

const counters = {
  queryReads: 0,
  legacyFallbackReads: 0,
  errors: 0,
};

function warn(message, payload) {
  if (!isTelemetryEnabled() || !import.meta.env.DEV) {
    return;
  }
  console.warn(message, payload);
}

export const runtimeReadTelemetry = {
  markQueryRead() {
    counters.queryReads += 1;
  },

  markLegacyFallbackRead() {
    counters.legacyFallbackReads += 1;
  },

  markError() {
    counters.errors += 1;
  },

  warnFallback(payload) {
    warn("[runtimeReadGateway] query fallback", payload);
  },

  getCounters() {
    return { ...counters };
  },
};
