import PlatformRoleBadge from "../platformUsers/PlatformRoleBadge.jsx";
import { resolvePlatformRoleTypeLabel } from "./platformRoleModel.js";

export default function PlatformRolesTablePanel({
  roles = [],
  loading = false,
  searchQuery = "",
  selectedRoleKey = null,
  onSearchQueryChange,
  onRefresh,
  onCreate,
  onSelectRole,
}) {
  return (
    <section className="platform-roles-table-panel">
      <div className="platform-roles-table-panel__header">
        <h2 className="platform-roles-table-panel__title">Роли и доступы</h2>
      </div>

      <div className="platform-roles-toolbar">
        <label className="platform-roles-toolbar__field platform-roles-toolbar__field--search">
          <span className="platform-roles-toolbar__label">Поиск по ролям</span>
          <input
            type="search"
            className="platform-roles-toolbar__input"
            value={searchQuery}
            placeholder="Поиск по ролям..."
            onChange={(event) => onSearchQueryChange?.(event.target.value)}
          />
        </label>

        <button
          type="button"
          className="platform-roles-btn platform-roles-btn--secondary"
          onClick={onRefresh}
          disabled={loading}
        >
          Обновить
        </button>

        <button
          type="button"
          className="platform-roles-btn platform-roles-btn--primary"
          onClick={onCreate}
        >
          Создать роль
        </button>
      </div>

      <div className="platform-roles-table-wrap">
        <div className="platform-roles-table__head" aria-hidden="true">
          <span>Название роли</span>
          <span>Тип роли</span>
          <span>Пользователей</span>
        </div>

        {loading ? (
          <div className="platform-roles-table__empty">Загрузка…</div>
        ) : null}

        {!loading && roles.length === 0 ? (
          <div className="platform-roles-table__empty">Роли не найдены</div>
        ) : null}

        {!loading
          ? roles.map((role) => {
            const isSelected = role.key === selectedRoleKey;
            return (
              <button
                key={role.key}
                type="button"
                className={`platform-roles-table__row${isSelected ? " is-selected" : ""}`}
                onClick={() => onSelectRole?.(role)}
              >
                <span className="platform-roles-table__name">
                  <PlatformRoleBadge roleKey={role.key} className="platform-role-badge--table" />
                  <span className="platform-roles-table__name-text">{role.label}</span>
                </span>
                <span className="platform-roles-table__type">
                  {resolvePlatformRoleTypeLabel(role)}
                </span>
                <span className="platform-roles-table__count">{role.userCount ?? 0}</span>
              </button>
            );
          })
          : null}
      </div>
    </section>
  );
}
