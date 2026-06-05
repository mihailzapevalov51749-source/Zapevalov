import ViewEngineHierarchyTitleChrome from "../ViewEngineHierarchyTitleChrome.jsx";
import ViewEngineRowMenu from "./ViewEngineRowMenu.jsx";
import ViewEngineTitlePositionBadge from "../ViewEngineTitlePositionBadge.jsx";

/**
 * Title Field chrome: row menu (⋮), hierarchy tree, position, title value.
 */
export default function ViewEngineTitleFieldChrome({
  hierarchy = null,
  onToggleExpand,
  positionNumber = "",
  isRowHovered = false,
  rowActions = null,
  onCreateSubtask,
  onDelete,
  children,
}) {
  const showPositionBadge = Boolean(String(positionNumber || "").trim());
  const rowActionsEnabled = Boolean(rowActions?.enabled);
  const canCreateSubtask =
    rowActionsEnabled &&
    rowActions?.canCreateSubtask !== false &&
    typeof onCreateSubtask === "function";
  const canDelete =
    rowActionsEnabled &&
    rowActions?.canDelete !== false &&
    typeof onDelete === "function";

  const titleContent = (
    <div className="view-engine-title-field-chrome__value">
      {showPositionBadge ? <ViewEngineTitlePositionBadge value={positionNumber} /> : null}
      <div className="view-engine-title-field-chrome__title">{children}</div>
    </div>
  );

  const menu = rowActionsEnabled ? (
    <ViewEngineRowMenu
      visible={isRowHovered}
      canCreateSubtask={canCreateSubtask}
      canDelete={canDelete}
      createChildMenuLabel={rowActions?.createChildMenuLabel}
      onCreateSubtask={onCreateSubtask}
      onDelete={onDelete}
    />
  ) : null;

  const showHierarchy =
    hierarchy && typeof hierarchy === "object" && rowActions?.hierarchyTreeEnabled !== false;

  const rootClassName = [
    "view-engine-title-field-chrome",
    rowActionsEnabled ? "view-engine-title-field-chrome--with-menu" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (showHierarchy) {
    return (
      <div className={rootClassName}>
        {menu}
        <ViewEngineHierarchyTitleChrome
          hierarchy={hierarchy}
          onToggleExpand={onToggleExpand}
        >
          {titleContent}
        </ViewEngineHierarchyTitleChrome>
      </div>
    );
  }

  const level = Number.isFinite(Number(hierarchy?.level)) ? Number(hierarchy.level) : 0;

  return (
    <div className={rootClassName}>
      {menu}
      <div
        className="view-engine-title-field-chrome__body"
        style={{
          paddingLeft: level > 0 ? level * 18 + 2 : 0,
        }}
      >
        {titleContent}
      </div>
    </div>
  );
}
