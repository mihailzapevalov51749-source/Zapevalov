import { normalizeLookupValue } from "./lookupUtils";

export default function LookupValueRenderer({
  value,
  compact = false,
  emptyValue = "—",
}) {
  const lookup =
    normalizeLookupValue(
      value,
      emptyValue
    );

  const isEmpty =
    lookup.label === emptyValue;

  return (
    <div
      style={{
        minWidth: 0,

        fontSize: compact
          ? 12
          : 13,

        lineHeight: 1.3,

        fontWeight: 600,

        color: isEmpty
          ? "#94A3B8"
          : "#2563EB",

        whiteSpace: "nowrap",

        overflow: "hidden",

        textOverflow: "ellipsis",
      }}
    >
      {lookup.label}
    </div>
  );
}