const STATUS_STYLES = {
  ACTIVE: {
    background: "#dcfce7",
    color: "#166534",
    label: "ACTIVE",
  },
  DISABLED: {
    background: "#fef3c7",
    color: "#92400e",
    label: "DISABLED",
  },
  ARCHIVED: {
    background: "#e2e8f0",
    color: "#475569",
    label: "ARCHIVED",
  },
};

export default function TenantRegistryStatusBadge({ status }) {
  const normalized = String(status || "").trim().toUpperCase();
  const style = STATUS_STYLES[normalized] || {
    background: "#f1f5f9",
    color: "#64748b",
    label: normalized || "—",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 700,
        background: style.background,
        color: style.color,
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </span>
  );
}
