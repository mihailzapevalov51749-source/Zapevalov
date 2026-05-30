import {
  emitChatNavigateWithRetry,
  emitPendingTargetWithRetry,
  setPendingTargetCompat,
} from "./notificationNavigationBus.js";
import {
  buildPendingTarget,
  mapNotificationNavigateDetail,
} from "./notificationNavigationMapper.js";
import {
  resolveNotificationNavigationOutcome,
} from "./notificationTargetRouting.js";

const DEFAULT_CHAT_PAGE_ID = 35;

export function orchestrateNotificationNavigation({
  detail,
  activePageId,
  onSelectPage,
  pushNavigationState,
  chatPageId = DEFAULT_CHAT_PAGE_ID,
  user = null,
  pathname = window.location.pathname,
}) {
  const mapped = mapNotificationNavigateDetail(detail);
  const pendingTarget = buildPendingTarget({
    ...mapped,
    detail,
  });

  const outcome = resolveNotificationNavigationOutcome(pendingTarget, {
    pathname,
    user,
  });

  if (outcome.action === "blocked") {
    setPendingTargetCompat(outcome.blockedTarget);
    emitPendingTargetWithRetry(outcome.blockedTarget, [0, 150]);
    return outcome.blockedTarget;
  }

  if (outcome.action === "open_chat") {
    pushNavigationState?.({
      pageId: activePageId,
      pathname,
    });
    setPendingTargetCompat(pendingTarget);
    onSelectPage?.(chatPageId);
    emitChatNavigateWithRetry(pendingTarget, [300, 800, 1500]);
    return pendingTarget;
  }

  if (outcome.action === "open_file_overlay") {
    pushNavigationState?.({
      pageId: activePageId,
      pathname,
    });
    setPendingTargetCompat(pendingTarget);
    emitPendingTargetWithRetry(pendingTarget, [0, 300, 800]);
    return pendingTarget;
  }

  if (outcome.action === "open_object_overlay") {
    setPendingTargetCompat(pendingTarget);
    emitPendingTargetWithRetry(pendingTarget, [0, 300, 800]);
    return pendingTarget;
  }

  const fallbackBlocked = {
    type: "notification_unavailable",
    message:
      "Не удалось открыть объект. Уведомление создано по устаревшему формату.",
  };
  setPendingTargetCompat(fallbackBlocked);
  emitPendingTargetWithRetry(fallbackBlocked, [0]);
  return fallbackBlocked;
}
