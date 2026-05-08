import { styles } from "../styles/profileSidePanelStyles";

function normalizeAvatarSettings(settings) {
  const defaultSettings = {
    x: 0,
    y: 0,
    scale: 1,
  };

  if (!settings) return defaultSettings;

  if (typeof settings === "string") {
    try {
      return {
        ...defaultSettings,
        ...JSON.parse(settings),
      };
    } catch {
      return defaultSettings;
    }
  }

  if (typeof settings === "object") {
    return {
      ...defaultSettings,
      ...settings,
    };
  }

  return defaultSettings;
}

export default function ProfileAvatarCard({ user, initials, isEdit }) {
  const avatarSettings = normalizeAvatarSettings(user?.avatar_settings);

  return (
    <div style={styles.photoCard}>
      <div style={styles.avatarWrap}>
        {user?.avatar_url ? (
          <div style={styles.avatarViewport}>
            <img
              src={user.avatar_url}
              alt="Аватар"
              draggable={false}
              style={{
                ...styles.avatarImg,
                transform: `translate(${avatarSettings.x}px, ${avatarSettings.y}px) scale(${avatarSettings.scale})`,
                transformOrigin: "center center",
              }}
            />
          </div>
        ) : (
          <div style={styles.avatarFallback}>{initials}</div>
        )}

        <div style={styles.statusBadge}>В сети</div>
      </div>

      {isEdit && (
        <button type="button" style={styles.photoButton}>
          {user?.avatar_url ? "Сменить фото" : "Загрузить фото"}
        </button>
      )}
    </div>
  );
}