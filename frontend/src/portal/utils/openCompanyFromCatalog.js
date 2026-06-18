import { showPlatformNotification } from "../../shared/platformNotification/PlatformNotification";
import { createCustomerCompanyBridgeTicket } from "../../modules/controlPlane/api/customerCompaniesApi";
import {
  buildCompanyOpenUrl,
  buildCompanyPortalPath,
  buildSessionBridgeEntryUrl,
  normalizeBaseUrl,
} from "./openCompanyBridgeUrls.js";

export {
  buildCompanyOpenUrl,
  buildCompanyPortalPath,
  buildSessionBridgeEntryUrl,
  normalizeBaseUrl,
} from "./openCompanyBridgeUrls.js";

export function buildCompanyOpenFailureMessage(catalogItem, reason) {
  const portalId = catalogItem?.portal_id ?? catalogItem?.id ?? "—";
  const databaseName = catalogItem?.database_name ?? "—";
  const code = catalogItem?.code ?? "—";
  const homePageId = catalogItem?.home_page_id ?? "—";
  const frontendBaseUrl = catalogItem?.frontend_base_url ?? "—";

  return [
    "Не удалось открыть компанию:",
    reason,
    `portal_id=${portalId}`,
    `database_name=${databaseName}`,
    `code=${code}`,
    `home_page_id=${homePageId}`,
    `frontend_base_url=${frontendBaseUrl}`,
  ].join("\n");
}

function buildBridgeOpenFailureMessage(catalogItem, reason, status = "—") {
  const portalId = catalogItem?.portal_id ?? catalogItem?.id ?? "—";
  const tenantCode = catalogItem?.code ?? "—";

  return [
    "Не удалось открыть компанию через Session Bridge",
    `Причина: ${reason}`,
    `portal_id=${portalId}`,
    `tenant_code=${tenantCode}`,
    `status=${status}`,
  ].join("\n");
}

/**
 * Opens client company via Session Bridge (CP ticket → client bridge entry).
 *
 * @param {object} catalogItem
 * @returns {Promise<boolean>}
 */
export async function openCompanyFromCatalog(catalogItem) {
  const portalPath = buildCompanyPortalPath(catalogItem);
  const frontendBaseUrl = normalizeBaseUrl(catalogItem?.frontend_base_url);
  const portalId = Number(catalogItem?.portal_id ?? catalogItem?.id);

  if (!portalPath) {
    const reason =
      catalogItem?.home_page_id == null
        ? "home_page_id не задан в каталоге"
        : "portal_id или home_page_id не заданы в каталоге";

    showPlatformNotification({
      message: buildCompanyOpenFailureMessage(catalogItem, reason),
      variant: "warning",
    });
    return false;
  }

  if (!frontendBaseUrl) {
    showPlatformNotification({
      message: buildCompanyOpenFailureMessage(
        catalogItem,
        "frontend_base_url не задан в каталоге",
      ),
      variant: "warning",
    });
    return false;
  }

  if (!Number.isFinite(portalId) || portalId <= 0) {
    showPlatformNotification({
      message: buildCompanyOpenFailureMessage(catalogItem, "portal_id не задан"),
      variant: "warning",
    });
    return false;
  }

  try {
    const ticketResponse = await createCustomerCompanyBridgeTicket(portalId);
    const entryUrl = buildSessionBridgeEntryUrl({
      frontendBaseUrl,
      bridgeTicket: ticketResponse?.bridge_ticket,
      redirectPath: portalPath,
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
      message: buildBridgeOpenFailureMessage(catalogItem, reason, status),
      variant: "warning",
    });
    return false;
  }
}
