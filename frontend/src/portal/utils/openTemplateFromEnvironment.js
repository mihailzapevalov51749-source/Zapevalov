import { showPlatformNotification } from "../../shared/platformNotification/PlatformNotification";
import { createPlatformEnvironmentBridgeTicket } from "../../modules/controlPlane/api/platformEnvironmentsApi";
import {
  buildSessionBridgeEntryUrl,
  normalizeBaseUrl,
} from "./openCompanyBridgeUrls.js";
import {
  shouldShowOpenTemplateButton,
  TEMPLATE_ENVIRONMENT_KEY,
} from "./templateEnvironmentLaunchHelpers.js";

export { shouldShowOpenTemplateButton, TEMPLATE_ENVIRONMENT_KEY } from "./templateEnvironmentLaunchHelpers.js";

function buildTemplateOpenFailureMessage(environment, reason, status = "—") {
  const portalId = environment?.id ?? "—";
  const environmentKey = environment?.environment_key ?? "—";

  return [
    "Не удалось открыть эталон через Session Bridge",
    `Причина: ${reason}`,
    `portal_id=${portalId}`,
    `environment_key=${environmentKey}`,
    `status=${status}`,
  ].join("\n");
}

/**
 * Opens TEMPLATE infrastructure environment via Session Bridge.
 *
 * @param {object} environment
 * @returns {Promise<boolean>}
 */
export async function openTemplateFromEnvironment(environment) {
  if (!shouldShowOpenTemplateButton(environment)) {
    return false;
  }

  const portalId = Number(environment?.id);
  if (!Number.isFinite(portalId) || portalId <= 0) {
    showPlatformNotification({
      message: buildTemplateOpenFailureMessage(environment, "portal_id не задан"),
      variant: "warning",
    });
    return false;
  }

  try {
    const ticketResponse = await createPlatformEnvironmentBridgeTicket(portalId);
    const entryUrl = buildSessionBridgeEntryUrl({
      frontendBaseUrl: normalizeBaseUrl(ticketResponse?.frontend_base_url),
      bridgeTicket: ticketResponse?.bridge_ticket,
      redirectPath: ticketResponse?.redirect_path,
    });

    if (!entryUrl) {
      throw new Error("Не удалось построить bridge entry URL");
    }

    window.open(entryUrl, "_blank", "noopener,noreferrer");
    return true;
  } catch (requestError) {
    const detail =
      requestError?.response?.data?.detail ||
      requestError?.message ||
      "Не удалось выпустить bridge ticket";
    const reason = typeof detail === "string" ? detail : "Не удалось выпустить bridge ticket";
    const status = requestError?.response?.status ?? requestError?.status ?? "—";

    showPlatformNotification({
      message: buildTemplateOpenFailureMessage(environment, reason, status),
      variant: "warning",
    });
    return false;
  }
}
