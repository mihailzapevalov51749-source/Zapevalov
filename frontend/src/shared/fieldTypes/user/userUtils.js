export const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

export const PROFILE_AVATAR_SIZE = 132;

export function normalizeAvatarSettings(settings) {
  if (!settings) {
    return DEFAULT_AVATAR_SETTINGS;
  }

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

export function getInitials(fullName) {
  if (!fullName) {
    return "?";
  }

  return String(fullName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function normalizeUser(value) {
  if (!value) {
    return {
      name: "—",
      avatarUrl: "",
      avatarSettings: DEFAULT_AVATAR_SETTINGS,
    };
  }

  if (Array.isArray(value)) {
    return normalizeUser(value[0]);
  }

  if (typeof value === "object") {
    return {
      name:
        value.full_name ||
        value.fullName ||
        value.name ||
        value.label ||
        value.email ||
        value.value ||
        "—",

      avatarUrl:
        value.avatar_url ||
        value.avatarUrl ||
        "",

      avatarSettings:
        value.avatar_settings ||
        value.avatarSettings ||
        DEFAULT_AVATAR_SETTINGS,
    };
  }

  return {
    name: String(value),
    avatarUrl: "",
    avatarSettings: DEFAULT_AVATAR_SETTINGS,
  };
}