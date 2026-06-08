import { showPlatformNotification } from "../../../shared/platformNotification/PlatformNotification.js";

export function notifyRuntimeActionNotImplemented() {
  showPlatformNotification({
    message: "Выполнение действий пока не реализовано.",
    variant: "info",
  });
}
