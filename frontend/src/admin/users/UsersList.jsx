import { styles } from "./usersStyles";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const PROFILE_AVATAR_SIZE = 132;

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

function getUserAvatarSettings(user) {
  return normalizeAvatarSettings(
    user?.avatar_settings ??
      user?.avatarSettings ??
      user?.avatar?.settings ??
      user?.avatar?.avatar_settings ??
      user?.profile?.avatar_settings
  );
}

function getAvatarTransform(user, size) {
  const settings = getUserAvatarSettings(user);
  const ratio = size / PROFILE_AVATAR_SIZE;

  return `translate(${(settings.x || 0) * ratio}px, ${
    (settings.y || 0) * ratio
  }px) scale(${settings.scale || 1})`;
}

export default function UsersList({
  users,
  loading,
  searchQuery,
  onSearch,
  onSelect,
  selectedUser,
  onClearSelection,
}) {
  const handleCloseSelectedUser = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (onClearSelection) {
      onClearSelection();
      return;
    }

    onSelect?.(null);
  };

  return (
    <div style={styles.listPanel}>
      <div style={styles.toolbar}>
        <input
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Поиск по пользователям"
          style={styles.searchInput}
        />
      </div>

      <div style={localStyles.tableHeader}>
        <div>Сотрудник</div>
        <div>Роль</div>
        <div>Подразделение</div>
        <div>Должность</div>
      </div>

      <div style={styles.userList}>
        {loading && <div style={styles.emptyState}>Загрузка...</div>}

        {!loading &&
          users.map((user) => {
            const roleName =
              user.role_name ||
              user.roleName ||
              (typeof user.role === "string"
                ? user.role
                : user.role?.name) ||
              "user";

            const isSelected = String(selectedUser?.id) === String(user.id);

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelect(user)}
                style={{
                  ...localStyles.userRow,
                  ...(isSelected ? localStyles.userRowActive : {}),
                }}
              >
                <div style={localStyles.userCell}>
                  <StatusDot active={user.is_active} />

                  <Avatar user={user} size={38} />

                  <div style={localStyles.userInfo}>
                    <div style={styles.userName}>
                      {user.full_name || "Без имени"}
                    </div>

                    <div style={styles.userEmail}>{user.email}</div>
                  </div>
                </div>

                <RoleBadge role={roleName} />

                <div style={localStyles.textCellWrap}>
                  {user.department || "Не указано"}
                </div>

                <div style={localStyles.textCellWrap}>
                  {user.position || "Не указано"}
                </div>

                {isSelected && (
                  <button
                    type="button"
                    onClick={handleCloseSelectedUser}
                    style={localStyles.closeButton}
                    title="Закрыть карточку пользователя"
                  >
                    ×
                  </button>
                )}
              </button>
            );
          })}

        {!loading && users.length === 0 && (
          <div style={styles.emptyState}>Пользователи не найдены</div>
        )}
      </div>
    </div>
  );
}

function Avatar({ user, size = 40 }) {
  const initials =
    user?.full_name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    "?";

  return (
    <div
      style={{
        ...styles.avatar,
        width: size,
        height: size,
        minWidth: size,
        fontSize: 15,
        border: "1px solid #cbd5e1",
        borderRadius: "50%",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt="Аватар"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
            transform: getAvatarTransform(user, size),
            transformOrigin: "center center",
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  return <span style={localStyles.roleBadge}>{role}</span>;
}

function StatusDot({ active }) {
  return (
    <span
      title={active ? "Активен" : "Отключён"}
      style={{
        ...localStyles.statusDot,
        background: active ? "#22c55e" : "#94a3b8",
      }}
    />
  );
}

const localStyles = {
  tableHeader: {
    display: "grid",
    gridTemplateColumns:
      "minmax(230px, 1.35fr) 120px minmax(130px, 0.8fr) minmax(140px, 0.9fr)",
    gap: 10,
    alignItems: "center",
    padding: "10px 46px 10px 16px",
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
    boxSizing: "border-box",
  },

  userRow: {
    position: "relative",
    display: "grid",
    gridTemplateColumns:
      "minmax(230px, 1.35fr) 120px minmax(130px, 0.8fr) minmax(140px, 0.9fr)",
    gap: 10,
    alignItems: "center",
    width: "100%",
    minHeight: 72,
    padding: "12px 46px 12px 16px",
    border: "none",
    borderBottom: "1px solid #f1f5f9",
    background: "#ffffff",
    cursor: "pointer",
    textAlign: "left",
    outline: "none",
    boxShadow: "none",
    boxSizing: "border-box",
  },

  userRowActive: {
    background: "#eff6ff",
  },

  userCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },

  userInfo: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },

  roleBadge: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: 112,
    height: 24,
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: 12,
    fontWeight: 700,
    padding: "0 8px",
    boxSizing: "border-box",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  textCellWrap: {
    minWidth: 0,
    fontSize: 13,
    color: "#64748b",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "normal",
    lineHeight: 1.25,
  },

  closeButton: {
    position: "absolute",
    top: "50%",
    right: 12,
    transform: "translateY(-50%)",
    width: 24,
    height: 24,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 17,
    fontWeight: 700,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    zIndex: 2,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    display: "block",
    flexShrink: 0,
  },
};