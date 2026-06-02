import { EMBEDDED_SURFACE_IDS } from "../embedded/embeddedSurfaceTypes.js";

/**
 * Build process surface contextData (no YASII logic).
 * Future BPMN/runtime modules pass a loaded process instance snapshot here.
 */
export function buildProcessContextData({
  tenantId,
  userId,
  processId,
  processName,
  processType = "",
  processStatus = "",
  activeStepId = "",
  activeStepName = "",
  selectedScope,
  metadata,
}) {
  const normalizedProcessId = String(processId ?? "").trim();
  const normalizedProcessName = String(processName ?? "").trim();
  const normalizedProcessType = String(processType ?? "").trim() || "workflow";
  const normalizedProcessStatus = String(processStatus ?? "").trim() || "unknown";
  const normalizedStepId = String(activeStepId ?? "").trim();
  const normalizedStepName = String(activeStepName ?? "").trim();
  const normalizedMetadata =
    metadata && typeof metadata === "object"
      ? Object.fromEntries(
          Object.entries(metadata)
            .map(([key, value]) => [key, String(value ?? "").trim()])
            .filter(([, value]) => value),
        )
      : {};

  const normalizedScope =
    String(selectedScope ?? "").trim()
    || (normalizedProcessId
      ? `process:${normalizedProcessId}:${normalizedStepId || "step"}`
      : "process:integration-ready");

  const widgetId = normalizedProcessId
    ? `process-${normalizedProcessId}`
    : "process-integration";

  return {
    tenantId: String(tenantId ?? "").trim() || "0",
    userId: String(userId ?? "").trim(),
    processId: normalizedProcessId,
    processName: normalizedProcessName,
    processType: normalizedProcessType,
    processStatus: normalizedProcessStatus,
    activeStepId: normalizedStepId,
    activeStepName: normalizedStepName,
    selectedScope: normalizedScope,
    widgetId,
    metadata: {
      ...normalizedMetadata,
      processId: normalizedProcessId,
      processName: normalizedProcessName,
      processType: normalizedProcessType,
      processStatus: normalizedProcessStatus,
      activeStepId: normalizedStepId,
      activeStepName: normalizedStepName,
      processVersion: normalizedMetadata.processVersion || "",
      processPath: normalizedMetadata.processPath || "",
      processOwner: normalizedMetadata.processOwner || "",
    },
  };
}

export function buildProcessYasiiSurfaceValue(input) {
  const contextData = buildProcessContextData(input);
  if (!contextData) {
    return null;
  }

  return {
    surfaceId: EMBEDDED_SURFACE_IDS.PROCESS,
    contextData,
    inputPlaceholder: "Спросите ЯСИИ о текущем процессе...",
  };
}
