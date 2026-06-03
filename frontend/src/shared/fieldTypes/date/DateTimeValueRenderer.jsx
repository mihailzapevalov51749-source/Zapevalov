import { formatDateTimeRu } from "./dateUtils";

export default function DateTimeValueRenderer({
  value,
  compact = false,
  emptyValue = "—",
}) {
  const formattedDate = formatDateTimeRu(value, emptyValue);
  const isEmpty = formattedDate === emptyValue;

  return (
    <div
      style={{
        minWidth: 0,
        fontSize: compact ? 12 : 13,
        lineHeight: 1.3,
        fontWeight: 400,
        color: isEmpty ? "#94A3B8" : "#64748B",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {formattedDate}
    </div>
  );
}
