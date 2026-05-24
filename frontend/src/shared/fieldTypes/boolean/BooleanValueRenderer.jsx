import { normalizeBooleanValue } from "./booleanUtils";

export default function BooleanValueRenderer({
  value,
  compact = false,
}) {
  const checked =
    normalizeBooleanValue(value);

  return (
    <div
      style={{
        width: compact ? 16 : 18,
        height: compact ? 16 : 18,

        borderRadius: 5,

        border: checked
          ? "1px solid #2563EB"
          : "1px solid #CBD5E1",

        background: checked
          ? "#2563EB"
          : "#FFFFFF",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        fontSize: compact ? 10 : 11,
        fontWeight: 800,

        color: "#FFFFFF",

        flexShrink: 0,
      }}
    >
      {checked ? "✓" : ""}
    </div>
  );
}