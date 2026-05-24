import { normalizeTextValue } from "./textUtils";

export default function TextValueRenderer({
  value,
  compact = false,
  multiline = false,
  emptyValue = "—",
}) {
  const text = normalizeTextValue(value, emptyValue);
  const isEmpty = text === emptyValue;

  return (
    <div
      style={{
        minWidth: 0,

        fontSize: compact ? 12 : 13,
        lineHeight: multiline ? 1.45 : 1.3,
        fontWeight: 500,

        color: isEmpty ? "#94A3B8" : "#0F172A",

        whiteSpace: multiline ? "normal" : "nowrap",
        overflow: "hidden",
        textOverflow: multiline ? "clip" : "ellipsis",

        overflowWrap: multiline ? "anywhere" : "normal",
        wordBreak: multiline ? "break-word" : "normal",
      }}
    >
      {text}
    </div>
  );
}