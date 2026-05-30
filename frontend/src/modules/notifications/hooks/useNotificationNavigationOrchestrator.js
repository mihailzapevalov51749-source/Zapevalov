import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { subscribeNotificationNavigate } from "../navigation/notificationNavigationBus";
import { orchestrateNotificationNavigation } from "../navigation/notificationNavigationOrchestrator";
import {
  handleReturnToPreviousLocation,
  pushNavigationState,
} from "../navigation/notificationNavigationState";

export default function useNotificationNavigationOrchestrator({
  activePageId = null,
  onSelectPage = null,
  user = null,
  enabled = true,
}) {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function onNotificationNavigate(event) {
      orchestrateNotificationNavigation({
        detail: event.detail || {},
        activePageId,
        onSelectPage,
        pushNavigationState,
        user,
        pathname: window.location.pathname,
      });
    }

    function onReturnToPreviousLocation() {
      handleReturnToPreviousLocation({ activePageId, onSelectPage });
    }

    const unsubscribeNavigate = subscribeNotificationNavigate(onNotificationNavigate);

    window.addEventListener(
      "yasnopro:navigation:return",
      onReturnToPreviousLocation,
    );

    return () => {
      unsubscribeNavigate();
      window.removeEventListener(
        "yasnopro:navigation:return",
        onReturnToPreviousLocation,
      );
    };
  }, [activePageId, enabled, location.pathname, onSelectPage, user]);
}
