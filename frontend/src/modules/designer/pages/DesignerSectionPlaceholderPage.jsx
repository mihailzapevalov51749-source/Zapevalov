export default function DesignerSectionPlaceholderPage({ title }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 920,
        margin: "0 auto",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        background: "#FFFFFF",
        padding: "20px 22px",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          lineHeight: 1.3,
          color: "#0F172A",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 14,
          color: "#64748B",
        }}
      >
        Раздел в разработке
      </p>
    </div>
  );
}
