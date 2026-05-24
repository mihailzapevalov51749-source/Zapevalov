const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const PROFILE_AVATAR_SIZE = 132;

function getInitials(fullName) {
  if (!fullName) return "?";

  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeAvatarSettings(settings) {
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

export default function MessageAvatar({
  authorName,
  avatarUrl,
  avatarSettings,
  size = 28,
}) {
  const normalized = normalizeAvatarSettings(avatarSettings);

  const avatarRatio = size / PROFILE_AVATAR_SIZE;
  const avatarX = (Number(normalized.x) || 0) * avatarRatio;
  const avatarY = (Number(normalized.y) || 0) * avatarRatio;
  const avatarScale = Number(normalized.scale) || 1;

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#E2E8F0",
        color: "#0F172A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(10, Math.round(size * 0.42)),
        fontWeight: 800,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={authorName || "Аватар"}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
            transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarScale})`,
            transformOrigin: "center center",
          }}
        />
      ) : (
        getInitials(authorName)
      )}
    </div>
  );
}