/**
 * Dynamic display position inside Title Field (variant 3: plain text, no badge).
 */
export default function ViewEngineTitlePositionBadge({ value = "" }) {
  const displayValue = String(value || "").trim();

  if (!displayValue) {
    return null;
  }

  return (
    <span
      className="view-engine-title-position-text"
      title={`Позиция: ${displayValue}`}
      aria-hidden="true"
    >
      {displayValue}
    </span>
  );
}
