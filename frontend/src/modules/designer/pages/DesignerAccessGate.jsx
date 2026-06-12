import { Outlet } from "react-router-dom";

import { canAccessDesigner } from "../constants/designerRoles";

export default function DesignerAccessGate({ user }) {
  if (!canAccessDesigner(user)) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2>Нет доступа к Designer</h2>
        <p style={{ color: "#64748b" }}>
          Требуется роль суперадминистратора или администратора компании.
        </p>
      </div>
    );
  }

  return <Outlet context={{ user }} />;
}
