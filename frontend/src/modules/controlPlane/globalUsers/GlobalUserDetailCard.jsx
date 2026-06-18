import PlatformUserAvatar from "../platformUsers/PlatformUserAvatar.jsx";
import {
  formatGlobalStatusLabel,
  formatPlatformDateTime,
  resolveGlobalUserDisplayName,
} from "./globalUserUtils.js";

function Field({ label, children }) {
  return (
    <div className="global-user-detail__field">
      <span className="global-user-detail__label">{label}</span>
      <div className="global-user-detail__value">{children}</div>
    </div>
  );
}

export default function GlobalUserDetailCard({
  user,
  loading = false,
  actionLoading = false,
  actionMessage = "",
  onBlock,
  onUnblock,
  onResetPassword,
}) {
  if (loading) {
    return (
      <section className="platform-user-detail platform-user-detail--empty">
        <p>Загрузка карточки...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="platform-user-detail platform-user-detail--empty">
        <p>Выберите пользователя в списке</p>
      </section>
    );
  }

  const displayName = resolveGlobalUserDisplayName(user);

  return (
    <section className="platform-user-detail global-user-detail" aria-label="Карточка глобального пользователя">
      <header className="platform-user-detail__card-header">
        <div className="platform-user-detail__user-identity">
          <PlatformUserAvatar user={user} size={52} />
          <div className="platform-user-detail__user-text">
            <h2 className="platform-user-detail__full-name">{displayName}</h2>
            <p className="platform-user-detail__position">{user.email || "—"}</p>
          </div>
        </div>
      </header>

      <div className="platform-user-detail__section">
        <h3 className="platform-user-detail__section-title">Глобальная учетная запись</h3>
        <div className="global-user-detail__grid">
          <Field label="Email">{user.email || "—"}</Field>
          <Field label="Глобальный статус">
            {formatGlobalStatusLabel(user.global_status, user.is_active)}
          </Field>
          <Field label="Дата регистрации">
            {formatPlatformDateTime(user.created_at) || "—"}
          </Field>
          <Field label="Последний вход">
            {formatPlatformDateTime(user.last_login_at) || "—"}
          </Field>
          <Field label="Количество компаний">{user.companies_count}</Field>
        </div>
      </div>

      <div className="platform-user-detail__section">
        <h3 className="platform-user-detail__section-title">Компании</h3>
        {user.companies?.length ? (
          <ul className="global-user-detail__companies-list">
            {user.companies.map((company) => (
              <li key={`${company.tenant_id}-${company.role_key}`} className="global-user-detail__company-item">
                <span className="global-user-detail__company-name">{company.tenant_name}</span>
                <span className="global-user-detail__company-meta">
                  {company.role_key} · {company.membership_status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="global-user-detail__empty-companies">Нет членства в компаниях</p>
        )}
      </div>

      {actionMessage ? (
        <div className="global-user-detail__action-message">{actionMessage}</div>
      ) : null}

      <div className="platform-user-detail__actions global-user-detail__actions">
        {user.is_active ? (
          <button
            type="button"
            className="platform-users-btn platform-users-btn--outline platform-users-btn--warning"
            disabled={actionLoading}
            onClick={onBlock}
          >
            Заблокировать
          </button>
        ) : (
          <button
            type="button"
            className="platform-users-btn platform-users-btn--outline"
            disabled={actionLoading}
            onClick={onUnblock}
          >
            Разблокировать
          </button>
        )}
        <button
          type="button"
          className="platform-users-btn platform-users-btn--primary"
          disabled={actionLoading}
          onClick={onResetPassword}
        >
          Сбросить пароль
        </button>
      </div>
    </section>
  );
}
