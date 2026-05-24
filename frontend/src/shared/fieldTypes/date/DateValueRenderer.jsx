import { normalizeDateValue } from "./dateUtils";

export default function DateValueRenderer({
  value,
  compact = false,
  emptyValue = "—",
}) {
  const formattedDate =
    normalizeDateValue(
      value,
      emptyValue
    );

  const isEmpty =
    formattedDate === emptyValue;

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
          : "#64748B",

        whiteSpace: "nowrap",

        overflow: "hidden",

        textOverflow: "ellipsis",
      }}
    >
      {formattedDate}
    </div>
  );
}