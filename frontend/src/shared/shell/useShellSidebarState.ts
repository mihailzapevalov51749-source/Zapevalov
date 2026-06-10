import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { resolveTenantIdFromPathname } from "../tenantContext/tenantContextResolver.js";
import { writeTenantUiPref } from "../uiStorage/uiPreferencesStorage.js";
import { migrateLegacyBooleanPref } from "../uiStorage/uiStorageMigration.js";
import {
  LEGACY_UI_KEYS,
  parseTenantIdFromUiStorageKey,
  UI_PREF_KEYS,
} from "../uiStorage/uiStorageKeys.js";

export const SHELL_SIDEBAR_COLLAPSED_CHANGED_EVENT =
  "yasnopro:shell-sidebar-collapsed-changed";

/** @deprecated Migration/tests only — use tenant-scoped storage. */
export const SHELL_SIDEBAR_COLLAPSED_KEY = LEGACY_UI_KEYS.SIDEBAR_COLLAPSED;

type ShellSidebarCollapsedListener = (
  tenantId: number,
  collapsed: boolean,
) => void;

const collapsedByTenant = new Map<number, boolean>();
const shellSidebarCollapsedListeners = new Set<ShellSidebarCollapsedListener>();

function cacheCollapsedForTenant(tenantId: number, collapsed: boolean): void {
  collapsedByTenant.set(tenantId, collapsed);
}

function getCachedCollapsedForTenant(tenantId: number): boolean {
  if (collapsedByTenant.has(tenantId)) {
    return collapsedByTenant.get(tenantId) as boolean;
  }

  const value = readShellSidebarCollapsed(tenantId);
  cacheCollapsedForTenant(tenantId, value);
  return value;
}

export function readShellSidebarCollapsed(tenantId?: number | null): boolean {
  if (!tenantId || Number(tenantId) <= 0) {
    return false;
  }

  return migrateLegacyBooleanPref(
    tenantId,
    UI_PREF_KEYS.SIDEBAR_COLLAPSED,
    LEGACY_UI_KEYS.SIDEBAR_COLLAPSED,
    false,
  );
}

export function readShellSidebarCollapsedForCurrentUrl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const tenantId = resolveTenantIdFromPathname(window.location.pathname);
  if (!tenantId) {
    return false;
  }

  return readShellSidebarCollapsed(tenantId);
}

export function writeShellSidebarCollapsed(
  tenantId: number,
  collapsed: boolean,
): void {
  if (!tenantId || Number(tenantId) <= 0) {
    return;
  }

  cacheCollapsedForTenant(tenantId, collapsed);
  writeTenantUiPref(
    tenantId,
    UI_PREF_KEYS.SIDEBAR_COLLAPSED,
    String(collapsed),
  );

  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SHELL_SIDEBAR_COLLAPSED_CHANGED_EVENT, {
      detail: { tenantId, collapsed },
    }),
  );
}

function publishShellSidebarCollapsed(
  tenantId: number,
  next: boolean,
): void {
  if (!tenantId || Number(tenantId) <= 0) {
    return;
  }

  if (getCachedCollapsedForTenant(tenantId) === next) {
    return;
  }

  writeShellSidebarCollapsed(tenantId, next);
  shellSidebarCollapsedListeners.forEach((listener) =>
    listener(tenantId, next),
  );
}

function subscribeShellSidebarCollapsed(
  listener: ShellSidebarCollapsedListener,
): () => void {
  shellSidebarCollapsedListeners.add(listener);

  return () => {
    shellSidebarCollapsedListeners.delete(listener);
  };
}

function isSidebarCollapsedStorageKey(key: string | null): boolean {
  if (!key) {
    return false;
  }

  return (
    key === LEGACY_UI_KEYS.SIDEBAR_COLLAPSED ||
    key.endsWith(`:${UI_PREF_KEYS.SIDEBAR_COLLAPSED}`)
  );
}

export function useShellSidebarState() {
  const location = useLocation();
  const tenantId = resolveTenantIdFromPathname(location.pathname);

  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() =>
    tenantId ? getCachedCollapsedForTenant(tenantId) : false,
  );

  useEffect(() => {
    if (!tenantId) {
      setSidebarCollapsedState(false);
      return undefined;
    }

    setSidebarCollapsedState(getCachedCollapsedForTenant(tenantId));

    return subscribeShellSidebarCollapsed((changedTenantId, collapsed) => {
      if (changedTenantId === tenantId) {
        setSidebarCollapsedState(collapsed);
      }
    });
  }, [tenantId]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (!tenantId || !isSidebarCollapsedStorageKey(event.key)) {
        return;
      }

      const changedTenantId =
        parseTenantIdFromUiStorageKey(event.key ?? "") ?? tenantId;
      if (changedTenantId !== tenantId) {
        return;
      }

      const next = readShellSidebarCollapsed(tenantId);
      cacheCollapsedForTenant(tenantId, next);
      setSidebarCollapsedState(next);
    }

    function handleShellSidebarCollapsedChanged(event: Event) {
      if (!tenantId) {
        return;
      }

      const detail = (
        event as CustomEvent<{ tenantId?: number; collapsed?: boolean }>
      ).detail;

      if (detail?.tenantId != null && detail.tenantId !== tenantId) {
        return;
      }

      if (typeof detail?.collapsed === "boolean") {
        cacheCollapsedForTenant(tenantId, detail.collapsed);
        setSidebarCollapsedState(detail.collapsed);
        return;
      }

      const next = readShellSidebarCollapsed(tenantId);
      cacheCollapsedForTenant(tenantId, next);
      setSidebarCollapsedState(next);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      SHELL_SIDEBAR_COLLAPSED_CHANGED_EVENT,
      handleShellSidebarCollapsedChanged,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        SHELL_SIDEBAR_COLLAPSED_CHANGED_EVENT,
        handleShellSidebarCollapsedChanged,
      );
    };
  }, [tenantId]);

  const setSidebarCollapsed = useCallback(
    (value: boolean | ((previous: boolean) => boolean)) => {
      if (!tenantId) {
        return;
      }

      const previous = getCachedCollapsedForTenant(tenantId);
      const next = typeof value === "function" ? value(previous) : value;
      publishShellSidebarCollapsed(tenantId, next);
    },
    [tenantId],
  );

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((previous) => !previous);
  }, [setSidebarCollapsed]);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
    tenantId,
  };
}
