import { showPlatformNotification } from "../../shared/platformNotification/PlatformNotification";
import { resolvePortalHomePagePath } from "./resolvePortalHomePage";

export const OPEN_COMPANY_HOME_NOT_FOUND_MESSAGE =
  "Не удалось открыть компанию: главная страница не найдена";

/**
 * Opens tenant Office in a new tab using the real home page route.
 *
 * @param {number | string} tenantId
 * @returns {Promise<boolean>} true when a tab was opened
 */
export async function openCompanyInOffice(tenantId) {
  const path = await resolvePortalHomePagePath(tenantId, { strict: true });
  if (!path) {
    showPlatformNotification({
      message: OPEN_COMPANY_HOME_NOT_FOUND_MESSAGE,
      variant: "warning",
    });
    return false;
  }

  window.open(path, "_blank", "noopener,noreferrer");
  return true;
}
