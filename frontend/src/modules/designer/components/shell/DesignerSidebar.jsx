import { NavLink, useParams } from "react-router-dom";
import {
  Boxes,
  ChevronLeft,
  GitBranch,
  LayoutGrid,
  Settings,
  Users,
} from "lucide-react";

import logo from "../../../../assets/icons/logo.png";
import { getDesignerPath } from "../../../../shared/appMode/appModeStorage";
import { LAYOUT_TOKENS } from "../../../../shared/layout/layoutTokens";

import "./designerSidebar.css";

const COMPANY_MODEL_ITEMS = [
  { id: "objects", label: "Объекты", icon: Boxes, enabled: true },
  { id: "relations", label: "Связи", icon: GitBranch, enabled: false },
  { id: "views", label: "Представления", icon: LayoutGrid, enabled: false },
];

const PLATFORM_ITEMS = [
  { id: "users", label: "Пользователи", icon: Users, enabled: false },
  { id: "settings", label: "Системные настройки", icon: Settings, enabled: false },
];

export default function DesignerSidebar({ collapsed = false, onToggleCollapse }) {
  console.log("[RENDER DesignerSidebar]", { collapsed });
  const { tenantId = "1" } = useParams();
  const objectsPath = getDesignerPath(tenantId);

  return (
    <aside
      className={`designer-sidebar${collapsed ? " is-collapsed" : ""}`}
      aria-expanded={!collapsed}
    >
      <div className="designer-sidebar__brand">
        <img src={logo} alt="YasnoPro" className="designer-sidebar__brand-logo" />
        <div className="designer-sidebar__brand-text">
          <div className="designer-sidebar__brand-title">YasnoPro</div>
          <div className="designer-sidebar__brand-subtitle">Режим настроек</div>
        </div>
      </div>

      <div className="designer-sidebar__section-title">Модель компании</div>
      <nav className="designer-sidebar__nav">
        {COMPANY_MODEL_ITEMS.map((item) => {
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <button
                key={item.id}
                type="button"
                className="designer-sidebar__item is-disabled"
                disabled
                title="Скоро"
              >
                <Icon size={LAYOUT_TOKENS.sidebar.menuItemIconSize} />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={objectsPath}
              className={({ isActive }) =>
                `designer-sidebar__item ${isActive ? "is-active" : ""}`
              }
            >
              <Icon size={LAYOUT_TOKENS.sidebar.menuItemIconSize} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="designer-sidebar__section-title">Платформа</div>
      <nav className="designer-sidebar__nav">
        {PLATFORM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className="designer-sidebar__item is-disabled"
              disabled
              title="Скоро"
            >
              <Icon size={LAYOUT_TOKENS.sidebar.menuItemIconSize} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="designer-sidebar__collapse"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
      >
        <ChevronLeft
          size={16}
          className={`designer-sidebar__collapse-icon${
            collapsed ? " is-collapsed" : ""
          }`}
        />
        <span>Свернуть меню</span>
      </button>
    </aside>
  );
}
