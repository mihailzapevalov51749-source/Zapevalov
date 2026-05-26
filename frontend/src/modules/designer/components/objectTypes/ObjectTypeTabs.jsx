import { NavLink, useParams } from "react-router-dom";

import { DESIGNER_TABS } from "../../constants/tabs";
import { useDesignerShell } from "../../context/DesignerShellContext";

import "./objectTypeTabs.css";

export default function ObjectTypeTabs() {
  const { tenantId } = useDesignerShell();
  const { objectTypeId } = useParams();

  return (
    <div className="object-type-tabs">
      {DESIGNER_TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={`/designer/tenant/${tenantId}/object-types/${objectTypeId}/${tab.id}`}
          className={({ isActive }) =>
            `object-type-tabs__item ${isActive ? "is-active" : ""}`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
