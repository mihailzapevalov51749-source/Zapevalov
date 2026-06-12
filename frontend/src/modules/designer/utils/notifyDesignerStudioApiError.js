import { getApiErrorMessage } from "../api/platformApiClient";
import { showPlatformNotification } from "../../../shared/platformNotification/PlatformNotification";

export function notifyDesignerStudioApiError(err, fallbackMessage) {
  showPlatformNotification({
    message: getApiErrorMessage(err, fallbackMessage),
    variant: "warning",
  });
}
