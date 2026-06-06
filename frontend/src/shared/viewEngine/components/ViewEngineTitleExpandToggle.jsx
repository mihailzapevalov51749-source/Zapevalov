/**
 * Fixed-width expand/collapse control for hierarchy rows in Title Field.
 */
export default function ViewEngineTitleExpandToggle({
  hierarchy = null,
  onToggleExpand,
}) {
  const hasChildren = Boolean(hierarchy?.hasChildren);
  const isExpanded = Boolean(hierarchy?.isExpanded);

  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!hasChildren) {
      return;
    }

    onToggleExpand?.();
  };

  return (
    <div className="view-engine-title-field-chrome__expand-zone">
      <button
        type="button"
        className={[
          "view-engine-title-field-chrome__expand-toggle",
          hasChildren ? "is-active" : "is-spacer",
          isExpanded ? "is-expanded" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-view-engine-hierarchy-toggle="true"
        onClick={handleToggle}
        disabled={!hasChildren}
        title={hasChildren ? "Развернуть вложенные записи" : undefined}
        aria-label={
          hasChildren ? "Развернуть вложенные записи" : "Нет вложенных записей"
        }
        aria-hidden={!hasChildren}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren ? "›" : ""}
      </button>
    </div>
  );
}
