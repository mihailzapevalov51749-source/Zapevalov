import FieldEditor from "../fieldEditors/FieldEditor";
import FieldValueRenderer from "../fieldTypes/FieldValueRenderer";
import RelationTableCellRenderer from "../fieldTypes/relation/RelationTableCellRenderer";
import ExpandableTableCell from "../table/ExpandableTableCell";
import ViewEngineTitleFieldChrome from "./components/ViewEngineTitleFieldChrome.jsx";
import { resolveTitleFieldDisplayNumber } from "./utils/resolveTitleFieldDisplayNumber.js";
import { isRelationTableValue } from "../../modules/objectViews/services/relationTableValue";
import { isCreatableFieldType } from "../fieldEditors/fieldEditorRegistry";

import { isTableRowNumberPresentationFieldKey } from "../runtime/systemEntityFields";
import { formatSystemRowNumber } from "../entity-ui/entityValueUtils";
import {
  SYSTEM_COLUMN_KEYS,
  isViewEngineSystemColumn,
  normalizeSystemColumnKey,
} from "./systemColumnKeys";
import { fieldDefToRendererColumn } from "./utils/fieldDefToRendererColumn";
import { viewEngineCellWrapperStyle } from "./viewEngineStyles";

const TEXT_FIELD_TYPES = new Set([
  "text",
  "string",
  "long_text",
  "longtext",
  "textarea",
  "rich_text",
  "richtext",
]);

function isTextLikeField(type) {
  return TEXT_FIELD_TYPES.has(String(type || "").toLowerCase());
}

function resolveRowEntityTitle(row, titleFieldKey) {
  const normalizedKey = String(titleFieldKey || "").trim();

  if (!row || !normalizedKey) {
    return "";
  }

  const cells = Array.isArray(row.cells) ? row.cells : [];
  const titleCell = cells.find((cell) => String(cell?.fieldKey || "") === normalizedKey);

  if (titleCell?.value != null && titleCell.value !== "") {
    return String(titleCell.value);
  }

  const values = row.values && typeof row.values === "object" ? row.values : {};

  if (values[normalizedKey] != null && values[normalizedKey] !== "") {
    return String(values[normalizedKey]);
  }

  return "";
}

/**
 * Platform-agnostic cell renderer.
 * Contract: fieldDef + value (+ optional rendererContext) → FieldValueRenderer.
 */
export default function ViewEngineCell({
  fieldDef = null,
  value = null,
  column = null,
  row = null,
  rendererContext = null,
  compact = false,
  multiline = false,
  emptyValue = "—",
  isTitle = false,
  readOnly = true,
  onChange,
  isRowHovered = false,
}) {
  const resolvedFieldDef = fieldDef || column?.fieldDef || null;
  const rendererColumn = fieldDefToRendererColumn(resolvedFieldDef);
  const type = column?.type || resolvedFieldDef?.type || "text";
  const normalizedType = String(type || "").toLowerCase();
  const isFileField = ["file", "files", "attachment", "attachments"].includes(
    normalizedType,
  );
  const isTextField = isTextLikeField(normalizedType);
  const isPrimary = Boolean(isTitle || column?.isTitle);
  const hierarchyMeta =
    row?.hierarchy && typeof row.hierarchy === "object" ? row.hierarchy : null;
  const showHierarchyChrome =
    isPrimary &&
    hierarchyMeta &&
    rendererContext?.hierarchyTree?.enabled;
  const rowActions = rendererContext?.rowActions || null;
  const rowActionsEnabled = Boolean(isPrimary && rowActions?.enabled);
  const displayNumber = resolveTitleFieldDisplayNumber(row, {
    hierarchyTreeEnabled: showHierarchyChrome,
  });
  const useTitleFieldChrome =
    isPrimary &&
    (rowActionsEnabled ||
      showHierarchyChrome ||
      Boolean(displayNumber));
  const entityTitle = resolveRowEntityTitle(
    row,
    rowActions?.titleFieldKey || column?.key,
  );
  const isEntitySystemStatusColumn =
    isViewEngineSystemColumn(column) &&
    normalizeSystemColumnKey(column?.key) === SYSTEM_COLUMN_KEYS.status;
  const isEntityRecordNumberColumn =
    isTableRowNumberPresentationFieldKey(column?.key) ||
    (isViewEngineSystemColumn(column) &&
      normalizeSystemColumnKey(column?.key) === SYSTEM_COLUMN_KEYS.recordNumber);

  const isRelationColumn =
    normalizedType === "relation" || isRelationTableValue(value);

  const canInlineEdit =
    !readOnly &&
    !isEntitySystemStatusColumn &&
    resolvedFieldDef &&
    !isViewEngineSystemColumn(column) &&
    !isRelationColumn &&
    isCreatableFieldType(resolvedFieldDef.rawFieldType || resolvedFieldDef.type);

  const rendererRow = row
    ? {
        id: row.id,
        status: row.status,
        values: Object.fromEntries(
          (row.cells || []).map((cell) => [cell.fieldKey, cell.value]),
        ),
      }
    : null;

  const contextProps = rendererContext
    ? {
        resolveUser: rendererContext.resolveUser,
        resolveLookup: rendererContext.resolveLookup,
        onOpenFile: rendererContext.onOpenFile,
        previewMode: rendererContext.previewMode,
      }
    : {};

  const handleOpenFile =
    typeof rendererContext?.onOpenFile === "function"
      ? (file, meta = {}) => {
          rendererContext.onOpenFile(file, {
            ...meta,
            row: rendererRow,
            column: rendererColumn,
            fieldKey: resolvedFieldDef?.key || column?.key,
          });
        }
      : undefined;

  const renderValue = (expanded = false) => (
    <FieldValueRenderer
      type={type}
      value={value}
      column={rendererColumn}
      row={rendererRow}
      compact={compact}
      variant={compact && isFileField ? "table" : undefined}
      multiline={multiline || (compact && isTextField && expanded)}
      expanded={expanded}
      emptyValue={emptyValue}
      onOpenFile={isFileField ? handleOpenFile : undefined}
      {...contextProps}
    />
  );

  return (
    <div className="view-engine-table-data-cell" style={viewEngineCellWrapperStyle}>
      <div
        className={
          isPrimary
            ? "view-engine-table-cell-inner is-title"
            : "view-engine-table-cell-inner"
        }
      >
        {isEntitySystemStatusColumn ? (
          <span
            className="view-engine-table-status-badge"
            title={value != null && value !== "" ? String(value) : undefined}
          >
            {value != null && value !== "" ? String(value) : emptyValue}
          </span>
        ) : isEntityRecordNumberColumn ? (
          <span
            className="view-engine-table-record-number-cell"
            title={value != null && value !== "" ? String(value) : undefined}
            style={{
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: "#64748b",
            }}
          >
            {formatSystemRowNumber(value)}
          </span>
        ) : isRelationColumn ? (
          <RelationTableCellRenderer
            value={value}
            compact={compact}
            emptyValue={emptyValue}
            onOpenRelatedEntity={rendererContext?.onOpenRelatedEntity}
          />
        ) : canInlineEdit ? (
          <div
            className="view-engine-table-cell-editor"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <FieldEditor
              fieldDef={resolvedFieldDef}
              value={value}
              onChange={(nextValue) => onChange?.(nextValue)}
              readOnly={false}
              inline
            />
          </div>
        ) : useTitleFieldChrome ? (
          <ViewEngineTitleFieldChrome
            hierarchy={hierarchyMeta}
            displayNumber={displayNumber}
            hierarchyTreeEnabled={showHierarchyChrome}
            isRowHovered={isRowHovered}
            rowActions={
              rowActionsEnabled
                ? {
                    ...rowActions,
                    hierarchyTreeEnabled: showHierarchyChrome,
                  }
                : null
            }
            onCreateSubtask={() =>
              rowActions?.onCreateSubtask?.({
                entityId: row?.id,
                entityTitle,
              })
            }
            onDelete={() =>
              rowActions?.onBeginDeleteEntity?.({
                entityId: row?.id,
                entityTitle,
              })
            }
          >
            <ExpandableTableCell
              column={rendererColumn}
              value={value}
              align={rendererColumn?.align}
              readOnly
            >
              {({ expanded }) => renderValue(expanded)}
            </ExpandableTableCell>
          </ViewEngineTitleFieldChrome>
        ) : (
          <ExpandableTableCell
            column={rendererColumn}
            value={value}
            align={rendererColumn?.align}
            readOnly
          >
            {({ expanded }) => renderValue(expanded)}
          </ExpandableTableCell>
        )}
      </div>
    </div>
  );
}
