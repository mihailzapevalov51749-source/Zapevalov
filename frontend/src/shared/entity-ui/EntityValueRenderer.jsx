import {
  formatDateTime,
  getCellDisplayValue,
  getUserDisplayName,
} from "./entityValueUtils";

export default function EntityValueRenderer({
  column,
  value,
  fallback = "—",
  variant = "default",
}) {
  const type = String(column?.type || "text").toLowerCase();

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (type === "user") {
    return <EntityUser value={value} variant={variant} />;
  }

  if (type === "date" || type === "datetime") {
    return <EntityDate value={value} />;
  }

  if (type === "choice" || type === "status") {
    return <EntityStatus value={value} />;
  }

  if (type === "file" || type === "attachment") {
    return <EntityFile value={value} />;
  }

  return <EntityText value={value} />;
}

function EntityText({ value }) {
  return (
    <span
      title={getCellDisplayValue(value)}
      style={{
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {getCellDisplayValue(value)}
    </span>
  );
}

function EntityUser({ value, variant }) {
  const name = getUserDisplayName(value);
  const isCompact = variant === "compact";

  return (
    <span
      title={name}
      style={{
        minWidth: 0,
        maxWidth: "100%",
        display: "inline-flex",
        alignItems: "center",
        gap: isCompact ? 6 : 8,
        overflow: "hidden",
      }}
    >
      <span
        style={{
          width: isCompact ? 20 : 22,
          height: isCompact ? 20 : 22,
          minWidth: isCompact ? 20 : 22,
          borderRadius: "50%",
          background: "#E0E7FF",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isCompact ? 10 : 11,
          fontWeight: 700,
          color: "#3730A3",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {name?.[0] || "?"}
      </span>

      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    </span>
  );
}

function EntityDate({ value }) {
  const formattedValue = formatDateTime(value);

  return (
    <span
      title={formattedValue}
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {formattedValue}
    </span>
  );
}

function EntityStatus({ value }) {
  const label = getCellDisplayValue(value);

  return (
    <span
      title={label}
      style={{
        maxWidth: "100%",
        height: 22,
        padding: "0 10px",
        borderRadius: 999,
        background: "#EEF4FF",
        color: "#2563EB",
        display: "inline-flex",
        alignItems: "center",
        fontSize: 12,
        fontWeight: 700,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function EntityFile({ value }) {
  const files = Array.isArray(value) ? value : [value];

  const label =
    files
      .map((file) =>
        typeof file === "object"
          ? file.name || file.title || file.filename
          : String(file)
      )
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <span
      title={label}
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}