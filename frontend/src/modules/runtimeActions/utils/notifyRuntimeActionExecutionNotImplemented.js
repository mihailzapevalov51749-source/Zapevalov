import { showPlatformNotification } from "../../../shared/platformNotification/PlatformNotification.js";

export function notifyRuntimeActionExecutionNotImplemented() {
  showPlatformNotification({
    message: "Исполнение действия пока не реализовано.",
    variant: "info",
  });
}
