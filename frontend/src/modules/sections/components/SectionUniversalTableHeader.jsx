import TableRepresentationsBar from "../../universalTable/components/views/TableRepresentationsBar";

export default function SectionUniversalTableHeader({
  section,
  showTitle = true,
  hasUniversalTable = false,
  isEditMode = false,
  isTableInlineActive = false,

  tableColumns = [],
  tableViewState = {},
  tableIdentity = {},

  representations = [],
  activeRepresentationId = null,
  isRepresentationDirty = false,
  isBaseStateDirty = false,

  viewsVisibleLimit = 2,
  onViewsVisibleLimitChange,

  onToggleUniversalTableInlineEdit,
  onAddUniversalTableRow,

  onSelectRepresentation,
  onCreateRepresentation,
  onDeleteRepresentation,
  onToggleRepresentationVisibility,
  onMoveRepresentation,

  onToggleColumnVisibility,
  onOpenRepresentationFilters,

  onRenameRepresentation,
  onSaveRepresentation,
  onSaveAsRepresentation,
  onDuplicateRepresentation,
  onSetDefaultRepresentation,

  handleStartDragColumnWithSystem,
  handleDragOverColumnWithSystem,
  handleDropColumnWithSystem,
}) {
  if (!showTitle && !hasUniversalTable) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: 12,
        marginBottom: 10,
        paddingRight: isEditMode ? 190 : 0,
        userSelect: "none",
        flexShrink: 0,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {showTitle && getSectionIcon(section) && (
        <img
          src={getSectionIcon(section)}
          alt=""
          draggable={false}
          style={{
            width: 36,
            height: 36,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
      )}

      {showTitle && (
        <div style={{ minWidth: 0, flexShrink: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.2,
              fontWeight: 800,
              color: "#020617",
              whiteSpace: "nowrap",
            }}
          >
            {section?.title || "Раздел"}
          </h2>

          {section?.description && (
            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: 16,
                lineHeight: 1.45,
              }}
            >
              {section.description}
            </p>
          )}
        </div>
      )}

      {hasUniversalTable && (
        <div
          data-table-action="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: showTitle ? 1 : 0,
            minWidth: 0,
            flex: "1 1 auto",
          }}
        >
          <button
            type="button"
            onClick={onToggleUniversalTableInlineEdit}
            title={
              isTableInlineActive
                ? "Выключить редактирование таблицы"
                : "Редактировать таблицу"
            }
            style={getTableActionButtonStyle(isTableInlineActive)}
          >
            ✎
          </button>

          <button
            type="button"
            onClick={onAddUniversalTableRow}
            title="Добавить строку"
            style={getTableActionButtonStyle(false)}
          >
            +
          </button>

          <div
            style={{
              minWidth: 0,
              flex: "1 1 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <TableRepresentationsBar
              representations={representations}
              activeRepresentationId={activeRepresentationId}
              isRepresentationDirty={isRepresentationDirty}
              isBaseStateDirty={isBaseStateDirty}
              columns={tableColumns}
              tableViewState={tableViewState}
              tableIdentity={tableIdentity}
              viewsVisibleLimit={viewsVisibleLimit}
              onViewsVisibleLimitChange={onViewsVisibleLimitChange}
              onSelectRepresentation={onSelectRepresentation}
              onCreateRepresentation={onCreateRepresentation}
              onDeleteRepresentation={onDeleteRepresentation}
              onToggleRepresentationVisibility={onToggleRepresentationVisibility}
              onMoveRepresentation={onMoveRepresentation}
              onToggleColumnVisibility={onToggleColumnVisibility}
              onOpenRepresentationFilters={onOpenRepresentationFilters}
              onRenameRepresentation={onRenameRepresentation}
              onSaveRepresentation={onSaveRepresentation}
              onSaveAsRepresentation={onSaveAsRepresentation}
              onDuplicateRepresentation={onDuplicateRepresentation}
              onSetDefaultRepresentation={onSetDefaultRepresentation}
              handleStartDragColumnWithSystem={handleStartDragColumnWithSystem}
              handleDragOverColumnWithSystem={handleDragOverColumnWithSystem}
              handleDropColumnWithSystem={handleDropColumnWithSystem}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getSectionIcon(section) {
  return (
    section?.icon_url ||
    section?.iconUrl ||
    section?.icon ||
    section?.content?.icon_url ||
    section?.settings?.icon_url ||
    ""
  );
}

const getTableActionButtonStyle = (isActive = false) => ({
  width: 34,
  height: 34,
  borderRadius: 10,
  border: isActive ? "1px solid #2563eb" : "1px solid #dbe3ef",
  background: isActive ? "#2563eb" : "#ffffff",
  color: isActive ? "#ffffff" : "#2563eb",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  fontWeight: 800,
  boxShadow: isActive
    ? "0 6px 16px rgba(37, 99, 235, 0.35)"
    : "0 6px 14px rgba(15, 23, 42, 0.08)",
  flexShrink: 0,
  transition:
    "background 120ms ease, color 120ms ease, border 120ms ease, box-shadow 120ms ease",
});