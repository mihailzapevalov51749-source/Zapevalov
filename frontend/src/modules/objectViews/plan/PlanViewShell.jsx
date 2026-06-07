export default function PlanViewShell({
  treePanel,
  workArea,
  statusSlot = null,
  treePanelWidth = 360,
  onResizeStart,
}) {
  return (
    <div className="object-plan-view__shell">
      {statusSlot}
      <div className="object-plan-view__workspace">
        <aside
          className="object-plan-view__tree-pane"
          style={{ width: treePanelWidth, flexBasis: treePanelWidth }}
        >
          {treePanel}
        </aside>

        <div
          className="object-plan-view__resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину дерева"
          onMouseDown={onResizeStart}
        />

        <section className="object-plan-view__work-pane">{workArea}</section>
      </div>
    </div>
  );
}
