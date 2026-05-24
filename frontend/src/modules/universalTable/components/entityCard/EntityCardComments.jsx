import CommentsPanel from "../../../comments/components/CommentsPanel";

import {
  entityCardCommentsStyle,
} from "./styles/entityCardCommentsStyles";

export default function EntityCardComments({
  row,
  table,
  initialContext = null,
}) {
  const entityId =
    row?.id ||
    row?.rowId ||
    row?._id;

  const entityType =
    table?.slug ||
    table?.code ||
    table?.id
      ? `universal_table:${table?.id}`
      : "entity";

  if (!entityId) {
    return (
      <aside style={entityCardCommentsStyle}>
        <CommentsPanel
          entityType="entity"
          entityId="temp"
          initialContext={initialContext}
        />
      </aside>
    );
  }

  return (
    <aside style={entityCardCommentsStyle}>
      <CommentsPanel
        entityType={entityType}
        entityId={String(entityId)}
        initialContext={initialContext}
      />
    </aside>
  );
}