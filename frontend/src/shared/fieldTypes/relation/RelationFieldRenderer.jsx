import {
  relationChipLinkStyle,
  relationChipStyle,
  relationDeleteButtonStyle,
  relationEmptyStyle,
  relationListStyle,
} from "./relationFieldStyles";

/**
 * Read-only relation field links in entity card.
 */
export default function RelationFieldRenderer({
  items = [],
  cardinality = "one",
  loading = false,
  emptyLabel = "—",
  onOpenLinkedEntity = null,
  onDeleteLink = null,
  deletingEntityId = null,
  readOnly = false,
}) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const isMany = String(cardinality) === "many";

  if (loading && !normalizedItems.length) {
    return <div style={relationEmptyStyle}>Загрузка связей…</div>;
  }

  if (!normalizedItems.length) {
    return <div style={relationEmptyStyle}>{emptyLabel}</div>;
  }

  const visibleItems = isMany
    ? normalizedItems
    : normalizedItems.slice(0, 1);

  return (
    <div style={relationListStyle}>
      {visibleItems.map((item) => {
        const entityId = String(item?.entity_id ?? "").trim();
        const title = String(item?.title || entityId || "Запись");
        const isDeleting = deletingEntityId === entityId;

        return (
          <div key={entityId || item?.relation_instance_id} style={relationChipStyle}>
            <button
              type="button"
              style={relationChipLinkStyle}
              onClick={() => {
                if (!entityId) {
                  return;
                }

                onOpenLinkedEntity?.({
                  entityId,
                  title,
                });
              }}
              title={title}
            >
              {title}
            </button>

            {!readOnly && onDeleteLink ? (
              <button
                type="button"
                style={{
                  ...relationDeleteButtonStyle,
                  opacity: isDeleting ? 0.5 : 1,
                  cursor: isDeleting ? "wait" : "pointer",
                }}
                aria-label="Удалить связь"
                disabled={isDeleting}
                onClick={() => {
                  if (!entityId || isDeleting) {
                    return;
                  }

                  onDeleteLink(entityId);
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
