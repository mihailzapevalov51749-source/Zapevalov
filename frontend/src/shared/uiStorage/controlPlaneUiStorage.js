import { patchNavigationMenuSettings } from "../navigation/navigationMenuBlocks.js";
import {
  PLATFORM_UI_PREF_KEYS,
  PLATFORM_UI_SCOPES,
  buildPlatformUiStorageKey,
} from "./uiStorageKeys.js";

const SCOPE = PLATFORM_UI_SCOPES.CONTROL_PLANE;

export const CONTROL_PLANE_SIDEBAR_COLLAPSED_CHANGED_EVENT =
  "yasnopro:control-plane-sidebar-collapsed-changed";

export const CONTROL_PLANE_SYSTEM_MENU_SETTINGS_CHANGED_EVENT =
  "yasnopro:control-plane-system-menu-settings-changed";

function readRaw(key) {
  const storageKey = buildPlatformUiStorageKey(SCOPE, key);
  if (!storageKey) {
    return null;
  }

  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  const storageKey = buildPlatformUiStorageKey(SCOPE, key);
  if (!storageKey) {
    return false;
  }

  try {
    localStorage.setItem(storageKey, String(value));
    return true;
  } catch {
    return false;
  }
}

export function readControlPlaneSidebarCollapsed(defaultValue = false) {
  const raw = readRaw(PLATFORM_UI_PREF_KEYS.SIDEBAR_COLLAPSED);
  if (raw === null) {
    return defaultValue;
  }
  return raw === "true";
}

export function writeControlPlaneSidebarCollapsed(collapsed) {
  writeRaw(PLATFORM_UI_PREF_KEYS.SIDEBAR_COLLAPSED, String(Boolean(collapsed)));

  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CONTROL_PLANE_SIDEBAR_COLLAPSED_CHANGED_EVENT, {
      detail: { collapsed: Boolean(collapsed) },
    }),
  );
}

export function readControlPlaneLeftMenuScale(defaultValue = 1) {
  const raw = readRaw(PLATFORM_UI_PREF_KEYS.LEFT_MENU_SCALE);
  if (raw === null) {
    return defaultValue;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.max(0.8, Math.min(1.4, parsed));
}

export function writeControlPlaneLeftMenuScale(value) {
  const rounded = Math.max(0.8, Math.min(1.4, Number(value ?? 1)));
  writeRaw(PLATFORM_UI_PREF_KEYS.LEFT_MENU_SCALE, String(rounded));
  return rounded;
}

export function readControlPlaneActiveSection(defaultValue = "overview") {
  const raw = readRaw(PLATFORM_UI_PREF_KEYS.ACTIVE_SECTION);
  if (!raw) {
    return defaultValue;
  }
  return raw;
}

export function writeControlPlaneActiveSection(sectionKey) {
  writeRaw(PLATFORM_UI_PREF_KEYS.ACTIVE_SECTION, String(sectionKey || ""));
}

export function readControlPlaneMenuState(defaultValue = {}) {
  const raw =
    readRaw(PLATFORM_UI_PREF_KEYS.MENU_STATE)
    ?? readRaw(PLATFORM_UI_PREF_KEYS.MENU_COLLAPSED);
  if (!raw) {
    return defaultValue;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function writeControlPlaneMenuState(state) {
  writeRaw(
    PLATFORM_UI_PREF_KEYS.MENU_STATE,
    JSON.stringify(state && typeof state === "object" ? state : {}),
  );
}

export function readControlPlaneSystemMenuSettings(defaultValue = {}) {
  const raw = readRaw(PLATFORM_UI_PREF_KEYS.SYSTEM_MENU_SETTINGS);
  if (!raw) {
    return defaultValue;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function writeControlPlaneSystemMenuSettings(settings) {
  writeRaw(
    PLATFORM_UI_PREF_KEYS.SYSTEM_MENU_SETTINGS,
    JSON.stringify(settings && typeof settings === "object" ? settings : {}),
  );

  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CONTROL_PLANE_SYSTEM_MENU_SETTINGS_CHANGED_EVENT),
  );
}

export function patchControlPlaneSystemMenuOrder(items = []) {
  const current = readControlPlaneSystemMenuSettings();
  const next = patchNavigationMenuSettings(current, items);
  writeControlPlaneSystemMenuSettings(next);
  return next;
}

/** @deprecated Use readControlPlaneMenuState */
export function readControlPlaneMenuCollapsedState(defaultValue = {}) {
  return readControlPlaneMenuState(defaultValue);
}

/** @deprecated Use writeControlPlaneMenuState */
export function writeControlPlaneMenuCollapsedState(state) {
  writeControlPlaneMenuState(state);
}
