import { useCallback, useEffect, useState } from "react";

import {
  CONTROL_PLANE_SIDEBAR_COLLAPSED_CHANGED_EVENT,
  readControlPlaneSidebarCollapsed,
  writeControlPlaneSidebarCollapsed,
} from "../../../shared/uiStorage/controlPlaneUiStorage.js";
import {
  buildPlatformUiStorageKey,
  PLATFORM_UI_PREF_KEYS,
  PLATFORM_UI_SCOPES,
} from "../../../shared/uiStorage/uiStorageKeys.js";

function isControlPlaneSidebarStorageKey(key) {
  if (!key) {
    return false;
  }

  const expected = buildPlatformUiStorageKey(
    PLATFORM_UI_SCOPES.CONTROL_PLANE,
    PLATFORM_UI_PREF_KEYS.SIDEBAR_COLLAPSED,
  );
  return key === expected;
}

const collapsedCache = {
  value: false,
};

const collapsedListeners = new Set();

function getCachedControlPlaneSidebarCollapsed() {
  return collapsedCache.value;
}

function cacheControlPlaneSidebarCollapsed(collapsed) {
  collapsedCache.value = Boolean(collapsed);
}

function subscribeControlPlaneSidebarCollapsed(listener) {
  collapsedListeners.add(listener);
  return () => {
    collapsedListeners.delete(listener);
  };
}

function publishControlPlaneSidebarCollapsed(next) {
  const normalized = Boolean(next);
  if (getCachedControlPlaneSidebarCollapsed() === normalized) {
    return;
  }

  cacheControlPlaneSidebarCollapsed(normalized);
  writeControlPlaneSidebarCollapsed(normalized);
  collapsedListeners.forEach((listener) => listener(normalized));
}

export function useControlPlaneSidebarState() {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    const initial = readControlPlaneSidebarCollapsed(false);
    cacheControlPlaneSidebarCollapsed(initial);
    return initial;
  });

  useEffect(() => {
    const initial = readControlPlaneSidebarCollapsed(false);
    cacheControlPlaneSidebarCollapsed(initial);
    setSidebarCollapsedState(initial);

    return subscribeControlPlaneSidebarCollapsed((collapsed) => {
      setSidebarCollapsedState(collapsed);
    });
  }, []);

  useEffect(() => {
    function handleStorage(event) {
      if (!isControlPlaneSidebarStorageKey(event.key)) {
        return;
      }

      const next = readControlPlaneSidebarCollapsed(false);
      cacheControlPlaneSidebarCollapsed(next);
      setSidebarCollapsedState(next);
    }

    function handleCollapsedChanged(event) {
      const collapsed = event?.detail?.collapsed;
      if (typeof collapsed !== "boolean") {
        return;
      }

      cacheControlPlaneSidebarCollapsed(collapsed);
      setSidebarCollapsedState(collapsed);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      CONTROL_PLANE_SIDEBAR_COLLAPSED_CHANGED_EVENT,
      handleCollapsedChanged,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        CONTROL_PLANE_SIDEBAR_COLLAPSED_CHANGED_EVENT,
        handleCollapsedChanged,
      );
    };
  }, []);

  const setSidebarCollapsed = useCallback((value) => {
    const previous = getCachedControlPlaneSidebarCollapsed();
    const next = typeof value === "function" ? value(previous) : value;
    publishControlPlaneSidebarCollapsed(next);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((previous) => !previous);
  }, [setSidebarCollapsed]);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
  };
}
