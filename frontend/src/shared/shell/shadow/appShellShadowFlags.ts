export const APP_SHELL_SHADOW_DEV_FLAG_KEY = "yasnopro:dev:appshell-shadow";

export function readAppShellShadowDevFlag(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  try {
    return localStorage.getItem(APP_SHELL_SHADOW_DEV_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

export const APP_SHELL_SHADOW_FLAGS = {
  enabled: readAppShellShadowDevFlag(),
} as const;
