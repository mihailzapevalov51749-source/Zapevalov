import FieldEditor from "../fieldEditors/FieldEditor";
import FieldValueRenderer from "../fieldTypes/FieldValueRenderer";
import ExpandableTableCell from "../table/ExpandableTableCell";
import { isCreatableFieldType } from "../fieldEditors/fieldEditorRegistry";

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
  const isEntitySystemStatusColumn =
    isViewEngineSystemColumn(column) &&
    normalizeSystemColumnKey(column?.key) === SYSTEM_COLUMN_KEYS.status;

  const canInlineEdit =
    !readOnly &&
    !isEntitySystemStatusColumn &&
    resolvedFieldDef &&
    !isViewEngineSystemColumn(column) &&
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
