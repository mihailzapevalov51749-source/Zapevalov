import settingsIcon from "../../../../assets/icons/settings.gif";

import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";

import ViewSettingsCard from "./settings/ViewSettingsCard";

import {
  normalizeLimit,
  getRepresentationSettingsSummary,
  hasRepresentationSort,
  getSortSummary,
  isColumnOrderChanged,
} from "./helpers/tableRepresentationViewUtils";

import {
  tableRepresentationsOverflowMenuStyle,
  tableRepresentationsEmptyOverflowStyle,
  tableRepresentationsOverflowItemStyle,
  tableRepresentationsOverflowItemNameButtonStyle,
  tableRepresentationsOverflowActionsStyle,
  tableRepresentationsEyeButtonStyle,
  tableRepresentationsEyeIconStyle,
  tableRepresentationsSettingsWrapperStyle,
  tableRepresentationsSettingsButtonStyle,
  tableRepresentationsSettingsIconStyle,
  tableRepresentationsNameStyle,
  tableRepresentationsViewsLimitRowStyle,
  tableRepresentationsViewsLimitLabelStyle,
  tableRepresentationsViewsLimitControlStyle,
  tableRepresentationsViewsLimitInputStyle,
} from "../../styles/tableStyles";

export default function TableRepresentationsOverflowMenu({
  menuRef,
  settingsMenuRef,

  representations = [],
  activeRepresentationId = null,

  columns = [],
  tableViewState = {},

  viewsVisibleLimit = 2,
  onViewsVisibleLimitChange,

  settingsRepresentationId = null,

  renameRepresentationId = null,
  renameValue = "",
  setRenameValue,

  getPinnedSlotIndex,
  replacePinnedSlot,

  handleSelect,
  handleToggleVisibility,
  handleToggleSettings,

  handleStartRename,
  handleSubmitRename,
  handleCancelRename,

  handleSave,
  handleSaveAs,
  handleDuplicate,
  handleSetDefault,
  handleDelete,

  onToggleColumnVisibility,
  onOpenRepresentationFilters,

  handleStartDragColumnWithSystem,
  handleDragOverColumnWithSystem,
  handleDropColumnWithSystem,
}) {
  const normalizedViewsVisibleLimit = normalizeLimit(viewsVisibleLimit);

  const handleLimitChange = (nextValue) => {
    onViewsVisibleLimitChange?.(normalizeLimit(nextValue));
  };

  const renderViewsLimitControl = () => (
    <div style={tableRepresentationsViewsLimitRowStyle}>
      <div style={tableRepresentationsViewsLimitLabelStyle}>
        Кол-во представлений на экране
      </div>

      <div style={tableRepresentationsViewsLimitControlStyle}>
        <input
          type="number"
          min={0}
          max={6}
          value={normalizedViewsVisibleLimit}
          onChange={(event) => handleLimitChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          style={tableRepresentationsViewsLimitInputStyle}
        />
      </div>
    </div>
  );

  const renderRepresentationName = (representation) => {
    const summary = getRepresentationSettingsSummary(
      representation,
      columns,
      tableViewState,
      activeRepresentationId
    );

    return (
      <span
        style={{
          ...tableRepresentationsNameStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 3,
          minWidth: 0,
          width: "100%",
        }}
      >
        <span
          style={{
            display: "block",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {representation.isDefault ? "★ " : ""}
          {representation.name || "Без названия"}
        </span>

        <span
          style={{
            display: "block",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11,
            fontWeight: 500,
            lineHeight: "14px",
            color: "#64748b",
          }}
          title={summary}
        >
          {summary}
        </span>
      </span>
    );
  };

  const renderPositionSelect = (representation) => {
    const currentPosition = getPinnedSlotIndex?.(representation);

    return (
      <select
        value={currentPosition !== null ? currentPosition + 1 : ""}
        disabled={representation.isVisible === false}
        onChange={(event) => {
          event.stopPropagation();

          const nextIndex = Number(event.target.value) - 1;

          if (nextIndex >= 0) {
            replacePinnedSlot?.(representation, nextIndex);
          }
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: 58,
          height: 34,
          borderRadius: 9,
          border: "1px solid #dbe3ef",
          background: "#ffffff",
          color: "#2563eb",
          fontSize: 13,
          fontWeight: 700,
          padding: "0 8px",
          outline: "none",
          cursor:
            representation.isVisible === false ? "not-allowed" : "pointer",
          opacity: representation.isVisible === false ? 0.45 : 1,
        }}
        title="Позиция представления"
      >
        {Array.from({ length: normalizedViewsVisibleLimit }).map((_, index) => (
          <option key={index} value={index + 1}>
            {index + 1}
          </option>
        ))}
      </select>
    );
  };

  const renderSettingsCard = (representation) => {
    const sortSummary = getSortSummary(representation, columns);
    const hasSort = hasRepresentationSort(representation);
    const hasColumnOrder = isColumnOrderChanged(representation, columns);

    const isRenaming =
      String(renameRepresentationId) === String(representation.id);

    return (
      <div
        ref={settingsMenuRef}
        style={{
          position: "fixed",
          top: 96,
          right: 44,
          zIndex: 999999,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <ViewSettingsCard
          representation={representation}
          columns={columns}
          tableViewState={tableViewState}
          activeRepresentationId={activeRepresentationId}
          sortLabel={hasSort ? sortSummary : "Без сортировки"}
          hasColumnOrderChanges={hasColumnOrder}
          isDefault={representation.isDefault}
          isHidden={representation.isVisible === false}
          isRenaming={isRenaming}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          canSave={true}
          onSave={(event) => handleSave(event, representation)}
          onDelete={(event) => handleDelete(event, representation)}
          onToggleVisibility={(event) =>
            handleToggleVisibility(event, representation)
          }
          onSetDefault={(event) => handleSetDefault(event, representation)}
          onStartRename={(event) => handleStartRename(event, representation)}
          onSubmitRename={(event) => handleSubmitRename(event, representation)}
          onCancelRename={handleCancelRename}
          onSaveAs={(event) => handleSaveAs(event, representation)}
          onDuplicate={(event) => handleDuplicate(event, representation)}
          onToggleColumnVisibility={onToggleColumnVisibility}
          onOpenRepresentationFilters={onOpenRepresentationFilters}
          handleStartDragColumnWithSystem={handleStartDragColumnWithSystem}
          handleDragOverColumnWithSystem={handleDragOverColumnWithSystem}
          handleDropColumnWithSystem={handleDropColumnWithSystem}
        />
      </div>
    );
  };

  const renderOverflowItem = (representation) => {
    const representationId = String(representation.id);

    const isActive =
      String(activeRepresentationId) === representationId;

    const isSettingsOpen =
      String(settingsRepresentationId) === representationId;

    const isHidden = representation.isVisible === false;

    return (
      <div
        key={`${representationId}_${representation.position}_overflow`}
        style={{
          ...tableRepresentationsOverflowItemStyle,
          background: isActive ? "#f8fbff" : "#ffffff",
          opacity: isHidden ? 0.65 : 1,
          alignItems: "center",
          minHeight: 58,
        }}
      >
        <button
          type="button"
          disabled={isHidden}
          onClick={() => handleSelect(representation)}
          style={{
            ...tableRepresentationsOverflowItemNameButtonStyle,
            color: isActive ? "#2563eb" : "#334155",
            fontWeight: isActive ? 700 : 600,
            cursor: isHidden ? "not-allowed" : "pointer",
            minWidth: 0,
            flex: 1,
            paddingTop: 7,
            paddingBottom: 7,
          }}
          title={representation.name}
        >
          {renderRepresentationName(representation)}
        </button>

        <div style={tableRepresentationsOverflowActionsStyle}>
          {normalizedViewsVisibleLimit > 0 &&
            renderPositionSelect(representation)}

          <button
            type="button"
            onClick={(event) =>
              handleToggleVisibility(event, representation)
            }
            style={tableRepresentationsEyeButtonStyle}
            title={
              representation.isVisible
                ? "Скрыть представление"
                : "Показать представление"
            }
          >
            <img
              src={representation.isVisible ? eyeOpenIcon : eyeClosedIcon}
              alt=""
              draggable={false}
              style={tableRepresentationsEyeIconStyle}
            />
          </button>

          <div style={tableRepresentationsSettingsWrapperStyle}>
            <button
              type="button"
              onClick={(event) =>
                handleToggleSettings(event, representation)
              }
              style={{
                ...tableRepresentationsSettingsButtonStyle,
                background: isSettingsOpen ? "#eff6ff" : "#ffffff",
                borderColor: isSettingsOpen ? "#93c5fd" : "#dbe3ef",
              }}
              title="Настроить представление"
            >
              <img
                src={settingsIcon}
                alt=""
                draggable={false}
                style={tableRepresentationsSettingsIconStyle}
              />
            </button>

            {isSettingsOpen && renderSettingsCard(representation)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
  ref={menuRef}
  data-table-representations-portal-menu="true"
  onMouseDown={(event) => {
    event.stopPropagation();
  }}
  onClick={(event) => {
    event.stopPropagation();
  }}
  onPointerDown={(event) => {
    event.stopPropagation();
  }}
  style={tableRepresentationsOverflowMenuStyle}
>
      {renderViewsLimitControl()}

      {representations.length === 0 ? (
        <div style={tableRepresentationsEmptyOverflowStyle}>
          Представлений пока нет
        </div>
      ) : (
        representations.map(renderOverflowItem)
      )}
    </div>
  );
}