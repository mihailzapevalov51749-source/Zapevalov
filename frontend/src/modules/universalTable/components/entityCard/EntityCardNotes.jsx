import EntityNotesEditor from "../../../../shared/notes/editor/EntityNotesEditor";

import {
  getEntityIdFromRow,
  getTableIdFromRow,
  resolvePublishedRuntimeRefFromRow,
} from "./services/entityCardNoteIdentity";

/**
 * Legacy UT Entity Card notes adapter (table_row identity + optional row bridge).
 */
export default function EntityCardNotes({
  row,
  entityType = "table_row",
  initialContext = null,
  publishedRuntimeRef = null,
  onCountChange,
}) {
  const entityId = getEntityIdFromRow(row);
  const tableId = getTableIdFromRow(row);
  const resolvedPublishedRuntimeRef = resolvePublishedRuntimeRefFromRow({
    row,
    publishedRuntimeRef,
  });

  if (!entityId) {
    return null;
  }

  return (
    <EntityNotesEditor
      entityType={entityType}
      entityId={String(entityId)}
      tableId={tableId ? String(tableId) : null}
      publishedRuntimeRef={resolvedPublishedRuntimeRef}
      initialContext={initialContext}
      onCountChange={onCountChange}
    />
  );
}
