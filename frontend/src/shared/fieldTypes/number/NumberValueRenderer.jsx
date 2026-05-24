import { normalizeNumberValue } from "./numberUtils";

export default function NumberValueRenderer({
  value,
  compact = false,
  emptyValue = "—",
}) {
  const formattedNumber =
    normalizeNumberValue(
      value,
      emptyValue
    );

  const isEmpty =
    formattedNumber === emptyValue;

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
      {formattedNumber}
    </div>
  );
}