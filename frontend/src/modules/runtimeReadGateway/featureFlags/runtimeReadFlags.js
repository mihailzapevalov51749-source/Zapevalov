export const runtimeReadFlags = {
  enableTelemetry: true,
};

export function isTelemetryEnabled() {
  return runtimeReadFlags.enableTelemetry;
}
