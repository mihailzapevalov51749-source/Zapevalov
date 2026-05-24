export const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

export const PROFILE_AVATAR_SIZE = 132;

export function normalizeAvatarSettings(settings) {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

  if (typeof settings === "string") {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function buildAvatarTransform({
  settings,
  containerSize,
}) {
  const normalized =
    normalizeAvatarSettings(settings);

  const ratio =
    containerSize / PROFILE_AVATAR_SIZE;

  const x = (normalized.x || 0) * ratio;
  const y = (normalized.y || 0) * ratio;

  const scale = normalized.scale || 1;

  return `translate(${x}px, ${y}px) scale(${scale})`;
}