import { Outlet } from "react-router-dom";

export default function DesignerAccessGate({ user }) {
  const roleName = user?.role || user?.role_name || user?.roleName;
  const allowed = ["admin", "superadmin", "platform_designer", "platform_architect"].includes(
    roleName,
  );

  if (!allowed) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2>Нет доступа к Designer</h2>
        <p style={{ color: "#64748b" }}>
          Требуется роль аналитика платформы (platform_designer / platform_architect / admin).
        </p>
      </div>
    );
  }

  return <Outlet context={{ user }} />;
}
