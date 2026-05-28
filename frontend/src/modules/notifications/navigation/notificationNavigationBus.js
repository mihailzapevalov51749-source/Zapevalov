const EVENT_NOTIFICATION_NAVIGATE = "yasnopro:notification:navigate";
const EVENT_PENDING_TARGET = "yasnopro:notification:pending-target";
const EVENT_CHAT_NAVIGATE = "chat:navigate";

function emit(eventName, detail) {
  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
    })
  );
}

function subscribe(eventName, handler) {
  window.addEventListener(eventName, handler);

  return () => {
    window.removeEventListener(eventName, handler);
  };
}

export function emitNotificationNavigate(detail) {
  emit(EVENT_NOTIFICATION_NAVIGATE, detail);
}

export function emitPendingTarget(detail) {
  emit(EVENT_PENDING_TARGET, detail);
}

export function emitChatNavigate(detail) {
  emit(EVENT_CHAT_NAVIGATE, detail);
}

export function setPendingTargetCompat(target) {
  window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = target;
}

export function emitPendingTargetWithRetry(detail, delays = [0, 300, 800, 1500]) {
  if (!detail) return;

  delays.forEach((delay) => {
    window.setTimeout(() => {
      emitPendingTarget(detail);
    }, delay);
  });
}

export function emitChatNavigateWithRetry(detail, delays = [300, 800, 1500]) {
  if (!detail) return;

  delays.forEach((delay) => {
    window.setTimeout(() => {
      emitChatNavigate(detail);
    }, delay);
  });
}

export function subscribeNotificationNavigate(handler) {
  return subscribe(EVENT_NOTIFICATION_NAVIGATE, handler);
}

export function subscribePendingTarget(handler) {
  return subscribe(EVENT_PENDING_TARGET, handler);
}

export function subscribeChatNavigate(handler) {
  return subscribe(EVENT_CHAT_NAVIGATE, handler);
}
