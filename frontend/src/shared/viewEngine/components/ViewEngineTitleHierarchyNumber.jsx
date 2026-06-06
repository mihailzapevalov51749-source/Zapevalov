/**
 * Compact hierarchy / position number before title text (not record_number).
 */
export default function ViewEngineTitleHierarchyNumber({ value = "" }) {
  const displayValue = String(value || "").trim();

  if (!displayValue) {
    return <div className="view-engine-title-field-chrome__number-zone" aria-hidden="true" />;
  }

  return (
    <div className="view-engine-title-field-chrome__number-zone">
      <span
        className="view-engine-title-hierarchy-number"
        title={`Позиция: ${displayValue}`}
        aria-hidden="true"
      >
        {displayValue}
      </span>
    </div>
  );
}
