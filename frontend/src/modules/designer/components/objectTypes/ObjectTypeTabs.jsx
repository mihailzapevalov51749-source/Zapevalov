import { NavLink, useParams } from "react-router-dom";

import { DESIGNER_TABS } from "../../constants/tabs";
import { useDesignerShell } from "../../context/DesignerShellContext";

import "./objectTypeTabs.css";

export default function ObjectTypeTabs() {
  const { tenantId } = useDesignerShell();
  const { objectTypeId } = useParams();

  return (
    <nav className="object-type-tabs" aria-label="Вкладки типа объекта">
      <div className="object-type-tabs__list">
        {DESIGNER_TABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={`/designer/tenant/${tenantId}/object-types/${objectTypeId}/${tab.id}`}
            className={({ isActive }) =>
              `object-type-tabs__link${isActive ? " is-active" : ""}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
