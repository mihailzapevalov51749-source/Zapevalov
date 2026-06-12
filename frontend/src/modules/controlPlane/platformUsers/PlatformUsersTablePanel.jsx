import {
  loadPlatformRoleCatalog,
  PLATFORM_ROLE_FILTER_ALL,
  PLATFORM_STATUS_FILTER_ALL,
} from "./platformUserConstants.js";
import { formatPlatformLastLogin } from "./platformUserUtils.js";
import PlatformRoleBadge from "./PlatformRoleBadge.jsx";
import PlatformUserAvatar from "./PlatformUserAvatar.jsx";
export default function PlatformUsersTablePanel({
  users = [],
  loading = false,
  searchQuery = "",
  roleFilter = PLATFORM_ROLE_FILTER_ALL,
  statusFilter = PLATFORM_STATUS_FILTER_ALL,
  selectedUserId = null,
  onSearchQueryChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onCreate,
  onSelectUser,
}) {
  const roleCatalog = loadPlatformRoleCatalog();

  return (
    <section className="platform-users-table-panel">
      <div className="platform-users-table-panel__header">
        <h2 className="platform-users-table-panel__title">Пользователи платформы</h2>
      </div>

      <div className="platform-users-toolbar">
        <label className="platform-users-toolbar__field platform-users-toolbar__field--search">
          <span className="platform-users-toolbar__label">Поиск</span>
          <input
            type="search"
            className="platform-users-toolbar__input"
            value={searchQuery}
            placeholder="Поиск по пользователям..."
            onChange={(event) => onSearchQueryChange?.(event.target.value)}
          />
        </label>

        <label className="platform-users-toolbar__field">
          <span className="platform-users-toolbar__label">Роль</span>
          <select
            className="platform-users-toolbar__select"
            value={roleFilter}
            onChange={(event) => onRoleFilterChange?.(event.target.value)}
          >
            <option value={PLATFORM_ROLE_FILTER_ALL}>Все роли</option>
            {roleCatalog.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
        </label>

        <label className="platform-users-toolbar__field">
          <span className="platform-users-toolbar__label">Статус</span>
          <select
            className="platform-users-toolbar__select"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange?.(event.target.value)}
          >
            <option value={PLATFORM_STATUS_FILTER_ALL}>Все статусы</option>
            <option value="active">Активен</option>
            <option value="inactive">Неактивен</option>
          </select>
        </label>

        <button type="button" className="platform-users-btn platform-users-btn--primary" onClick={onCreate}>
          + Создать
        </button>
      </div>

      <div className="platform-users-table-wrap">
        <div className="platform-users-table__head" aria-hidden="true">
          <span>Пользователь</span>
          <span>Роль платформы</span>
          <span>Статус</span>
          <span>Последний вход</span>
        </div>

        <div className="platform-users-table__body">
          {loading ? (
            <p className="platform-users-table__empty">Загрузка пользователей...</p>
          ) : null}

          {!loading && users.length === 0 ? (
            <p className="platform-users-table__empty">Пользователи не найдены</p>
          ) : null}

          {!loading
            && users.map((user) => {
              const isSelected = String(user.id) === String(selectedUserId);
              return (
                <button
                  key={user.id ?? `new-${user.email}`}
                  type="button"
                  className={`platform-users-table__row${isSelected ? " is-selected" : ""}`}
                  onClick={() => onSelectUser?.(user)}
                >
                  <span className="platform-users-table__user-cell">
                    <PlatformUserAvatar user={user} size={36} />
                    <span className="platform-users-table__user-text">
                      <span className="platform-users-table__user-name">
                        {user.full_name || "Без имени"}
                      </span>
                      <span className="platform-users-table__user-email">{user.email || "—"}</span>
                    </span>
                  </span>
                  <span className="platform-users-table__role-cell">
                    <PlatformRoleBadge roleKey={user.platformRoleKey} />
                  </span>
                  <span className="platform-users-table__status-cell">
                    <span className={`platform-status-badge${user.is_active ? " is-active" : ""}`}>
                      {user.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </span>
                  <span className="platform-users-table__login-cell">
                    {formatPlatformLastLogin(user.last_login_at)}
                  </span>
                </button>
              );
            })}
        </div>

        <footer className="platform-users-table__footer">
          <span>Всего: {users.length} пользователей</span>
        </footer>
      </div>
    </section>
  );
}
