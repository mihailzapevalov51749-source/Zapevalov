/**
 * Expand/collapse + indent for hierarchy tree in Title Field column (Object Table).
 */
export default function ViewEngineHierarchyTitleChrome({
  hierarchy = null,
  onToggleExpand,
  children,
}) {
  if (!hierarchy || typeof hierarchy !== "object") {
    return children;
  }

  const level = Number.isFinite(Number(hierarchy.level))
    ? Number(hierarchy.level)
    : 0;
  const hasChildren = Boolean(hierarchy.hasChildren);
  const isExpanded = Boolean(hierarchy.isExpanded);

  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!hasChildren) {
      return;
    }

    onToggleExpand?.();
  };

  return (
    <div
      className="view-engine-hierarchy-title-chrome"
      style={{
        display: "grid",
        gridTemplateColumns: "16px minmax(0, 1fr)",
        alignItems: "center",
        columnGap: 6,
        width: "100%",
        minWidth: 0,
        paddingLeft: level * 18 + 2,
        boxSizing: "border-box",
      }}
    >
      <button
        type="button"
        className="view-engine-hierarchy-tree-toggle"
        data-view-engine-hierarchy-toggle="true"
        onClick={handleToggle}
        disabled={!hasChildren}
        title={hasChildren ? "Развернуть вложенные записи" : ""}
        aria-label={hasChildren ? "Развернуть вложенные записи" : "Нет вложенных записей"}
        style={{
          width: 16,
          height: 16,
          minWidth: 16,
          border: "none",
          borderRadius: 4,
          background: "transparent",
          color: hasChildren ? "#0f172a" : "transparent",
          cursor: hasChildren ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          lineHeight: 1,
          padding: 0,
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.14s ease",
          flex: "0 0 auto",
          pointerEvents: hasChildren ? "auto" : "none",
        }}
      >
        ›
      </button>
      <div
        className="view-engine-hierarchy-title-chrome__value"
        style={{ minWidth: 0, overflow: "hidden" }}
      >
        {children}
      </div>
    </div>
  );
}
