import {
  emitChatNavigateWithRetry,
  emitPendingTargetWithRetry,
  setPendingTargetCompat,
} from "./notificationNavigationBus";
import {
  buildPendingTarget,
  mapNotificationNavigateDetail,
} from "./notificationNavigationMapper";

const DEFAULT_CHAT_PAGE_ID = 35;

export function orchestrateNotificationNavigation({
  detail,
  activePageId,
  onSelectPage,
  pushNavigationState,
  navigateToRuntimeRoute,
  chatPageId = DEFAULT_CHAT_PAGE_ID,
}) {
  const mapped = mapNotificationNavigateDetail(detail);
  const { entityType, entityId, fileId, publishedRuntimeRef } = mapped;

  if (!entityType && !fileId) {
    console.warn("PORTAL NOTIFICATION ROUTER: entity not found", {
      detail,
    });
    return null;
  }

  pushNavigationState({
    pageId: activePageId,
    pathname: window.location.pathname,
  });

  const pendingTarget = buildPendingTarget({
    ...mapped,
    detail,
  });

  setPendingTargetCompat(pendingTarget);

  console.log("PORTAL NOTIFICATION ROUTER:", pendingTarget);

  if (publishedRuntimeRef?.runtime_route) {
    navigateToRuntimeRoute?.(publishedRuntimeRef.runtime_route);
    emitPendingTargetWithRetry(pendingTarget, [300]);
    return pendingTarget;
  }

  if (entityType === "chat") {
    onSelectPage?.(chatPageId);
    emitChatNavigateWithRetry(pendingTarget, [300, 800, 1500]);
    return pendingTarget;
  }

  emitPendingTargetWithRetry(pendingTarget, [0, 300, 800, 1500]);
  return pendingTarget;
}
