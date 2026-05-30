/**
 * Simple offset pagination for hosted read-only tables.
 */
export default function ViewEnginePagination({
  pagination,
  onPrevious,
  onNext,
}) {
  if (!pagination) {
    return null;
  }

  const { total, limit, offset, hasMore } = pagination;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "#64748b", fontSize: 13 }}>
        total: {total} · limit: {limit} · offset: {offset}
      </span>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="designer-btn"
          disabled={offset <= 0}
          onClick={onPrevious}
        >
          Назад
        </button>
        <button
          type="button"
          className="designer-btn"
          disabled={!hasMore}
          onClick={onNext}
        >
          Вперёд
        </button>
      </div>
    </div>
  );
}
