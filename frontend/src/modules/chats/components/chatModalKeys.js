export const CHAT_MODAL_VIEWPORT_INSET = 24;

export const CHAT_MODAL_CONTENT_STYLE = {
  flex: 1,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
  background: "#ffffff",
};

export const CHAT_CREATE_MODAL_KEY = "chat_create_modal";

export const CHAT_CREATE_MODAL_DEFAULT_BOUNDS = {
  width: 520,
  height: 640,
};

export const CHAT_SETTINGS_MODAL_KEY = "chat_settings_modal";

export const CHAT_SETTINGS_MODAL_DEFAULT_BOUNDS = {
  width: 480,
  height: 420,
};

export const CHAT_PARTICIPANTS_MODAL_KEY = "chat_participants_modal";

export const CHAT_PARTICIPANTS_MODAL_DEFAULT_BOUNDS = {
  width: 520,
  height: 640,
};

// Backward-compatible aliases
export const CHAT_CREATE_MODAL_VIEWPORT_INSET = CHAT_MODAL_VIEWPORT_INSET;
export const CHAT_CREATE_MODAL_CONTENT_STYLE = CHAT_MODAL_CONTENT_STYLE;
