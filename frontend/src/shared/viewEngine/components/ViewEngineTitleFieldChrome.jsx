import ViewEngineRowMenu from "./ViewEngineRowMenu.jsx";
import ViewEngineTitleHierarchyNumber from "./ViewEngineTitleHierarchyNumber.jsx";

const TREE_LEVEL_INDENT_PX = 18;

/**
 * Title Field chrome: [menu hover zone] [hierarchy number] [title].
 */
export default function ViewEngineTitleFieldChrome({
  hierarchy = null,
  displayNumber = "",
  hierarchyTreeEnabled = false,
  isRowHovered = false,
  rowActions = null,
  entityId = null,
  onCreateSubtask,
  onDelete,
  children,
}) {
  const rowActionsEnabled = Boolean(rowActions?.enabled);
  const showTreeIndent = Boolean(
    hierarchyTreeEnabled && hierarchy && typeof hierarchy === "object",
  );
  const level = showTreeIndent && Number.isFinite(Number(hierarchy?.level))
    ? Number(hierarchy.level)
    : 0;

  const rowActionsReadOnly = Boolean(rowActions?.readOnly);
  const canCreateSubtask =
    rowActionsEnabled &&
    rowActions?.canCreateSubtask !== false &&
    (rowActionsReadOnly || typeof onCreateSubtask === "function");
  const canDelete =
    rowActionsEnabled &&
    rowActions?.canDelete !== false &&
    (rowActionsReadOnly || typeof onDelete === "function");
  const runtimePlacedActions = Array.isArray(rowActions?.runtimePlacedActions)
    ? rowActions.runtimePlacedActions
    : [];
  const hasRuntimePlacedActions = runtimePlacedActions.length > 0;
  const showRowMenu =
    rowActionsEnabled &&
    (canCreateSubtask || canDelete || hasRuntimePlacedActions);

  const rootClassName = [
    "view-engine-title-field-chrome",
    rowActionsEnabled ? "view-engine-title-field-chrome--with-menu" : "",
    showTreeIndent ? "view-engine-title-field-chrome--with-tree" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const menu = showRowMenu ? (
    <ViewEngineRowMenu
      visible={isRowHovered}
      readOnly={rowActionsReadOnly}
      canCreateSubtask={canCreateSubtask}
      canDelete={canDelete}
      createChildMenuLabel={rowActions?.createChildMenuLabel}
      onCreateSubtask={onCreateSubtask}
      onDelete={onDelete}
      runtimePlacedActions={runtimePlacedActions}
      runtimeActionContext={{
        tenantId: rowActions?.tenantId ?? null,
        objectTypeKey: rowActions?.objectTypeKey ?? null,
        entityId: entityId ?? null,
        onActionClick: rowActions?.onRuntimeActionClick ?? null,
      }}
    />
  ) : null;

  return (
    <div className={rootClassName}>
      {menu}
      <div
        className="view-engine-title-field-chrome__body"
        style={
          showTreeIndent && level > 0
            ? { paddingLeft: level * TREE_LEVEL_INDENT_PX }
            : undefined
        }
      >
        <div className="view-engine-title-field-chrome__content">
          <ViewEngineTitleHierarchyNumber value={displayNumber} />
          <div className="view-engine-title-field-chrome__title">{children}</div>
        </div>
      </div>
    </div>
  );
}
