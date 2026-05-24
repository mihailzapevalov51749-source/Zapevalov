import { useMemo, useState } from "react";

import TableCellEditor from "../cellEditors/TableCellEditor";

import { cellWrapperStyle } from "../../styles/tableStyles";

import {
  SYSTEM_COLUMN_IDS,
  getColumnId,
  getJustifyByAlign,
  getSystemValue,
  isSystemColumn,
  isSystemUserColumn,
  normalizeAlign,
} from "../../../../shared/entity-ui/entityValueUtils";

const COLLAPSED_TEXT_MAX_HEIGHT = 42;
const COLLAPSED_FILES_MAX_HEIGHT = 28;

function isFileLikeColumn(column) {
  const type = String(column?.type || "").toLowerCase();

  return [
    "file",
    "files",
    "attachment",
    "attachments",
    "document",
    "documents",
  ].includes(type);
}

function getArrayFromValue(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const candidates = [
      value.files,
      value.attachments,
      value.documents,
      value.items,
      value.value,
    ];

    return candidates.find(Array.isArray) || [];
  }

  return [];
}

function getValueText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    return String(
      value.label ||
        value.title ||
        value.name ||
        value.text ||
        value.value ||
        ""
    );
  }

  return "";
}

function getValueTextLength(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.fileName) return item.fileName;
        if (item?.file_name) return item.file_name;
        if (item?.name) return item.name;
        if (item?.title) return item.title;

        return "";
      })
      .join(" ").length;
  }

  return getValueText(value).length;
}

function shouldCollapseCell({ column, value, readOnly }) {
  if (!readOnly) {
    return false;
  }

  const items = getArrayFromValue(value);
  const isFiles = isFileLikeColumn(column);

  if (isFiles && items.length > 1) {
    return true;
  }

  if (items.length > 1) {
    return true;
  }

  return getValueTextLength(value) > 70;
}

export default function TableCell({
  column,
  value,
  onChange,
  readOnly = false,
  isPrimary = false,
  autoFocus = false,
  onOpenFile,
}) {
  const [isCellExpanded, setIsCellExpanded] = useState(false);

  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);

  const columnType = String(column?.type || "").toLowerCase();
  const columnId = getColumnId(column);

  const isSystemRowNumber =
    columnType === "system_row_number" ||
    columnId === SYSTEM_COLUMN_IDS.ROW_NUMBER;

  const isColumnSystem = isSystemColumn(column);
  const isColumnSystemUser =
    isColumnSystem && isSystemUserColumn(column);

  const systemValue = getSystemValue({ column, value });

  const isFiles = isFileLikeColumn(column);

  const isCollapsible = useMemo(
    () =>
      shouldCollapseCell({
        column,
        value,
        readOnly,
      }),
    [column, value, readOnly]
  );

  const shouldClip = isCollapsible && !isCellExpanded;

  const handleToggleCellExpand = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsCellExpanded((current) => !current);
  };

  const toggleLabel = isCellExpanded
    ? "Скрыть"
    : isFiles
      ? "Показать все"
      : "Показать полностью";

  return (
    <div
      data-table-action="true"
      data-primary-cell-editor={isPrimary ? "true" : undefined}
      style={{
        ...cellWrapperStyle,
        minHeight: 36,
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: isSystemRowNumber
          ? "center"
          : justifyContent,
        textAlign: isSystemRowNumber ? "center" : align,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        data-primary-cell-editor={isPrimary ? "true" : undefined}
        style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems:
            align === "right"
              ? "flex-end"
              : align === "center"
                ? "center"
                : "stretch",
          justifyContent: isSystemRowNumber
            ? "center"
            : justifyContent,
          textAlign: isSystemRowNumber ? "center" : align,
          overflow: "hidden",
          gap: 5,
        }}
      >
        <div
          style={{
            width: "100%",
            minWidth: 0,
            maxHeight: shouldClip
              ? isFiles
                ? COLLAPSED_FILES_MAX_HEIGHT
                : COLLAPSED_TEXT_MAX_HEIGHT
              : "none",
            overflow: shouldClip ? "hidden" : "visible",
          }}
        >
          {isColumnSystemUser ? (
            <TableCellEditor
              column={column}
              value={value}
              onChange={onChange}
              readOnly={true}
              isPrimary={isPrimary}
              autoFocus={autoFocus}
              onOpenFile={onOpenFile}
            />
          ) : isColumnSystem ? (
            <span
              title={systemValue}
              style={{
                maxWidth: "100%",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                fontSize: 12,
                fontWeight: isSystemRowNumber ? 600 : 500,
                color: "#64748b",
                fontVariantNumeric: isSystemRowNumber
                  ? "tabular-nums"
                  : "normal",
                userSelect: "none",
              }}
            >
              {systemValue}
            </span>
          ) : (
            <TableCellEditor
              column={column}
              value={value}
              onChange={onChange}
              readOnly={readOnly}
              isPrimary={isPrimary}
              autoFocus={autoFocus}
              onOpenFile={onOpenFile}
            />
          )}
        </div>

        {isCollapsible ? (
          <button
            type="button"
            data-table-action="true"
            data-row-card-ignore="true"
            onClick={handleToggleCellExpand}
            style={{
              alignSelf:
                align === "right"
                  ? "flex-end"
                  : align === "center"
                    ? "center"
                    : "flex-start",
              border: "none",
              background: "transparent",
              color: "#64748B",
              cursor: "pointer",
              padding: 0,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {toggleLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}