import "./platformNotification.css";

const STACK_ID = "platform-notification-stack";
const DEFAULT_DURATION_MS = 6000;

function ensureNotificationStack() {
  if (typeof document === "undefined") {
    return null;
  }

  let stack = document.getElementById(STACK_ID);

  if (!stack) {
    stack = document.createElement("div");
    stack.id = STACK_ID;
    stack.className = "platform-notification-stack";
    stack.setAttribute("role", "status");
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }

  return stack;
}

/**
 * Lightweight platform toast for transient operation feedback.
 *
 * @param {{ message?: string, variant?: "info" | "warning", durationMs?: number }} [options]
 */
export function showPlatformNotification({
  message = "",
  variant = "info",
  durationMs = DEFAULT_DURATION_MS,
} = {}) {
  const text = String(message || "").trim();

  if (!text || typeof document === "undefined") {
    return;
  }

  const stack = ensureNotificationStack();

  if (!stack) {
    return;
  }

  const notification = document.createElement("p");
  notification.className = `platform-notification${
    variant === "warning" ? " platform-notification--warning" : ""
  }`;
  notification.textContent = text;
  stack.appendChild(notification);

  window.setTimeout(() => {
    notification.remove();

    if (!stack.childElementCount) {
      stack.remove();
    }
  }, Math.max(1000, Number(durationMs) || DEFAULT_DURATION_MS));
}
