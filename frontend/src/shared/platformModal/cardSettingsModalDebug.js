/** Dev-only traces for card_settings_modal integration. */
export const CARD_SETTINGS_MODAL_KEY = "card_settings_modal";

export const CARD_SETTINGS_MODAL_DEFAULT_BOUNDS = {
  x: 24,
  y: 48,
  width: 520,
  height: 720,
};

/** Set true locally to trace card_settings_modal in the console (never shown in UI). */
export const SHOW_MODAL_DEBUG = false;

export function debugCardSettingsModal(...args) {
  if (import.meta.env.DEV && SHOW_MODAL_DEBUG) {
    console.log("[card_settings_modal]", ...args);
  }
}
