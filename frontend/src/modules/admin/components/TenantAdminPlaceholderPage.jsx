const pageStyle = {
  flex: 1,
  minHeight: 0,
  padding: "8px 12px 20px",
  boxSizing: "border-box",
  background: "#F8FAFC",
};

const cardStyle = {
  background: "#fff",
  borderRadius: 8,
  padding: "24px 28px",
  border: "1px solid #e2e8f0",
};

export default function TenantAdminPlaceholderPage({
  title,
  description = "Раздел в разработке. Здесь будет управление на уровне компании.",
}) {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 8,
          }}
        >
          Администрирование компании
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: 24, color: "#0f172a" }}>{title}</h1>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.5, maxWidth: 720 }}>
          {description}
        </p>
      </div>
    </div>
  );
}
