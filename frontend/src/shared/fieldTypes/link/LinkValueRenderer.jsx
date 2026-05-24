import { normalizeLinkValue } from "./linkUtils";

export default function LinkValueRenderer({
  value,
  compact = false,
  emptyValue = "—",
}) {
  const link =
    normalizeLinkValue(
      value,
      emptyValue
    );

  const isEmpty =
    link.label === emptyValue;

  if (isEmpty) {
    return (
      <div
        style={{
          minWidth: 0,

          fontSize: compact
            ? 12
            : 13,

          fontWeight: 500,

          color: "#94A3B8",

          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {emptyValue}
      </div>
    );
  }

  return (
    <a
      href={link.url || "#"}
      target="_blank"
      rel="noreferrer"
      style={{
        minWidth: 0,

        display: "block",

        fontSize: compact
          ? 12
          : 13,

        lineHeight: 1.3,

        fontWeight: 500,

        color: "#2563EB",

        textDecoration: "none",

        whiteSpace: "nowrap",

        overflow: "hidden",

        textOverflow: "ellipsis",
      }}
    >
      {link.label}
    </a>
  );
}