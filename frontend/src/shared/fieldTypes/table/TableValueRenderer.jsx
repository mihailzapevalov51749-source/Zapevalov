import { normalizeTableValue } from "./tableUtils";

export default function TableValueRenderer({
  value,
  compact = false,
  emptyValue = "—",
}) {
  const table =
    normalizeTableValue(
      value,
      emptyValue
    );

  const isEmpty =
    table.label === emptyValue;

  return (
    <div
      style={{
        minWidth: 0,

        fontSize: compact
          ? 12
          : 13,

        lineHeight: 1.3,

        fontWeight: 500,

        color: isEmpty
          ? "#94A3B8"
          : "#0F172A",

        whiteSpace: "nowrap",

        overflow: "hidden",

        textOverflow: "ellipsis",
      }}
    >
      {table.label}
    </div>
  );
}