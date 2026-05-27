import { Bell, CircleHelp, MessageSquare } from "lucide-react";

import AppModeSwitch from "../../../../shared/appMode/AppModeSwitch";

import "./designerHeader.css";

export default function DesignerHeader({ tenantId, user }) {
  console.log("[RENDER DesignerHeader]", {
    tenantId,
    userId: user?.id,
  });
  const displayName = user?.full_name || user?.email || "Пользователь";
  const roleName = user?.role || user?.role_name || user?.roleName || "Аналитик";
  const initials =
    displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="designer-header">
      <div className="designer-header__left">
        <AppModeSwitch tenantId={tenantId} variant="designer" />
      </div>

      <div className="designer-header__center">
        <input
          className="designer-header__search"
          placeholder="Поиск по сотрудникам, подразделениям, должностям..."
          disabled
          title="Поиск будет доступен позже"
        />
      </div>

      <div className="designer-header__right">
        <button type="button" className="designer-header__icon-btn" title="Уведомления">
          <Bell size={18} />
        </button>
        <button type="button" className="designer-header__icon-btn" title="Сообщения">
          <MessageSquare size={18} />
        </button>
        <button type="button" className="designer-header__icon-btn" title="Справка">
          <CircleHelp size={18} />
        </button>

        <div className="designer-header__profile">
          <div className="designer-header__avatar">{initials}</div>
          <div className="designer-header__profile-text">
            <div className="designer-header__profile-name">{displayName}</div>
            <div className="designer-header__profile-role">{roleName}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
