export const PROFILE_MODE_PLATFORM = "platform";
export const PROFILE_MODE_TENANT = "tenant";

export function isProfileModePlatform(mode) {
  return mode === PROFILE_MODE_PLATFORM;
}

export function isProfileModeTenant(mode) {
  return mode === PROFILE_MODE_TENANT;
}

export function resolveProfileSettingsScope(mode) {
  return isProfileModePlatform(mode) ? "platform" : "tenant";
}
