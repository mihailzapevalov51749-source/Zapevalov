import EntityChecklistPanel from "../../../../shared/checklists/EntityChecklistPanel";

function getEntityId(row) {
  return row?.id || row?.row_id || row?.rowId || "";
}

/** Universal Table row card checklist adapter (`table_row` identity). */
export default function EntityCardChecklist({
  row,
  entityType = "table_row",
  onCountChange,
}) {
  return (
    <EntityChecklistPanel
      entityType={entityType}
      entityId={getEntityId(row)}
      onCountChange={onCountChange}
    />
  );
}
