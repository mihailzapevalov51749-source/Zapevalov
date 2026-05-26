export const runtimeReadFlags = {
  enableLegacyFallback: true,
  enableTelemetry: true,
};

export function isLegacyFallbackEnabled(overrideValue) {
  if (typeof overrideValue === "boolean") {
    return overrideValue;
  }
  return runtimeReadFlags.enableLegacyFallback;
}

export function isTelemetryEnabled() {
  return runtimeReadFlags.enableTelemetry;
}
