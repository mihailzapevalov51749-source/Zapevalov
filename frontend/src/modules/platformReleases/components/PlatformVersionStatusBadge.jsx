const STATUS_STYLES = {
  active: {
    background: "#dcfce7",
    color: "#166534",
    label: "Активна",
  },
  superseded: {
    background: "#e2e8f0",
    color: "#475569",
    label: "Заменена",
  },
  planned: {
    background: "#dbeafe",
    color: "#1d4ed8",
    label: "Запланирована",
  },
};

export default function PlatformVersionStatusBadge({ status }) {
  const normalized = String(status || "").trim().toLowerCase();
  const style = STATUS_STYLES[normalized] || {
    background: "#f1f5f9",
    color: "#64748b",
    label: normalized || "—",
  };

  return (
    <span className="platform-versions-page__status-badge" style={{ background: style.background, color: style.color }}>
      {style.label}
    </span>
  );
}
