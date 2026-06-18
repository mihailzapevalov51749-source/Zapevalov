import PlatformUserAvatar from "../platformUsers/PlatformUserAvatar.jsx";
import {
  formatGlobalStatusCompactLabel,
  formatPlatformLastLogin,
  resolveGlobalUserDisplayName,
} from "./globalUserUtils.js";

export default function GlobalUsersTablePanel({
  users = [],
  loading = false,
  searchQuery = "",
  selectedUserId = null,
  onSearchQueryChange,
  onSelectUser,
}) {
  return (
    <section className="platform-users-table-panel">
      <div className="platform-users-table-panel__header">
        <h2 className="platform-users-table-panel__title">Глобальные пользователи</h2>
      </div>

      <div className="platform-users-toolbar global-users-toolbar">
        <label className="platform-users-toolbar__field platform-users-toolbar__field--search">
          <input
            type="search"
            className="platform-users-toolbar__input"
            value={searchQuery}
            placeholder="Поиск по email или ФИО..."
            aria-label="Поиск по email или ФИО"
            onChange={(event) => onSearchQueryChange?.(event.target.value)}
          />
        </label>
      </div>

      <div className="platform-users-table-wrap global-users-table-wrap">
        <div className="platform-users-table__head global-users-table__head" aria-hidden="true">
          <span>Пользователь</span>
          <span>Статус</span>
          <span title="Количество компаний">Комп.</span>
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
            ? users.map((user) => {
                const isSelected = String(user.id) === String(selectedUserId);
                const displayName = resolveGlobalUserDisplayName(user);

                return (
                  <button
                    key={user.id}
                    type="button"
                    className={`platform-users-table__row global-users-table__row${isSelected ? " is-selected" : ""}`}
                    onClick={() => onSelectUser?.(user)}
                  >
                    <span className="platform-users-table__user-cell global-users-table__user-cell">
                      <PlatformUserAvatar user={user} size={36} />
                      <span className="platform-users-table__user-text global-users-table__user-text">
                        <span
                          className="platform-users-table__user-name global-users-table__user-name"
                          title={displayName}
                        >
                          {displayName}
                        </span>
                        <span
                          className="platform-users-table__user-email"
                          title={user.email || undefined}
                        >
                          {user.email || "—"}
                        </span>
                      </span>
                    </span>
                    <span className="platform-users-table__status-cell global-users-table__status-cell">
                      <span
                        className={`platform-status-badge global-users-table__status-badge${user.is_active ? " is-active" : ""}`}
                      >
                        {formatGlobalStatusCompactLabel(user.global_status, user.is_active)}
                      </span>
                    </span>
                    <span className="global-users-table__companies-count">{user.companies_count}</span>
                    <span
                      className="platform-users-table__login-cell global-users-table__login-cell"
                      title={user.last_login_at || undefined}
                    >
                      {formatPlatformLastLogin(user.last_login_at) || "—"}
                    </span>
                  </button>
                );
              })
            : null}
        </div>
      </div>
    </section>
  );
}
