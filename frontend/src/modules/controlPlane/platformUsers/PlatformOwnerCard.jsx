import { Settings } from "lucide-react";
import { Link } from "react-router-dom";

import emailIcon from "../../../assets/icons/email.png";
import { buildControlPlanePlatformProfilePath } from "../config/controlPlanePaths.js";
import PlatformRoleBadge from "./PlatformRoleBadge.jsx";
import PlatformUserAvatar from "./PlatformUserAvatar.jsx";

export default function PlatformOwnerCard({ owner, onOwnerSettings }) {
  if (!owner) {
    return (
      <section className="platform-owner-card platform-owner-card--empty">
        <p className="platform-owner-card__empty-text">
          Владелец платформы не назначен. Создайте владельца в разделе{" "}
          <Link to={buildControlPlanePlatformProfilePath("platform-owner")}>
            Профиль платформы → Владелец платформы
          </Link>
          .
        </p>
      </section>
    );
  }

  const isActive = Boolean(owner.is_active);

  return (
    <section className="platform-owner-card" aria-label="Владелец платформы">
      <div className="platform-owner-card__main">
        <PlatformUserAvatar user={owner} size={120} className="platform-user-avatar--owner" />

        <div className="platform-owner-card__owner-info">
          <h2 className="platform-owner-card__name">{owner.full_name || "Без имени"}</h2>

          <p className="platform-owner-card__role">
            <PlatformRoleBadge
              roleKey="platform_owner"
              className="platform-role-badge--owner-card"
            />
            <span
              className={`platform-owner-card__status${isActive ? " is-active" : ""}`}
            >
              <span className="platform-owner-card__status-dot" aria-hidden />
              {isActive ? "Активен" : "Неактивен"}
            </span>
          </p>

          <p className="platform-owner-card__description">Полный доступ к платформе</p>

          <p className="platform-owner-card__email">
            <img src={emailIcon} alt="" className="platform-owner-card__email-icon" aria-hidden />
            <span className="platform-owner-card__email-text">{owner.email || "—"}</span>
          </p>
        </div>
      </div>

      <div className="platform-owner-card__actions">
        <Link
          to={buildControlPlanePlatformProfilePath("platform-owner")}
          className="platform-owner-card__action-btn"
        >
          <Settings size={15} strokeWidth={2} aria-hidden />
          <span>Редактировать в профиле платформы</span>
        </Link>
        <button
          type="button"
          className="platform-owner-card__transfer-stub"
          disabled
          title="Функция будет доступна позже"
        >
          Передать владение платформой
        </button>
      </div>
    </section>
  );
}
