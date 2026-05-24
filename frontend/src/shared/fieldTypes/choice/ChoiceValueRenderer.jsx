import { normalizeChoiceValue } from "./choiceUtils";

export default function ChoiceValueRenderer({
  value,
  column,
  compact = false,
  emptyValue = "—",
}) {
  const choice =
    normalizeChoiceValue(
      value,
      column
    );

  const isEmpty =
    choice.label === "—";

  return (
    <div
      style={{
        width: "fit-content",

        maxWidth: compact
          ? 96
          : 140,

        padding: compact
          ? "3px 8px"
          : "4px 10px",

        boxSizing: "border-box",

        borderRadius: 999,

        background:
          choice.color ||
          "#EEF2FF",

        color: choice.color
          ? "#FFFFFF"
          : isEmpty
          ? "#64748B"
          : "#1D4ED8",

        fontSize: compact
          ? 11
          : 12,

        fontWeight: 700,

        lineHeight: 1.2,

        whiteSpace: "nowrap",

        overflow: "hidden",

        textOverflow: "ellipsis",
      }}
    >
      {isEmpty
        ? emptyValue
        : choice.label}
    </div>
  );
}