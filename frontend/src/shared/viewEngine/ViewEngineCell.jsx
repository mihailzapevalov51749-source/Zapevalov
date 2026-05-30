import FieldValueRenderer from "../fieldTypes/FieldValueRenderer";

import { fieldDefToRendererColumn } from "./utils/fieldDefToRendererColumn";
import { viewEngineCellWrapperStyle } from "./viewEngineStyles";

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
}) {
  const resolvedFieldDef = fieldDef || column?.fieldDef || null;
  const rendererColumn = fieldDefToRendererColumn(resolvedFieldDef);
  const type = column?.type || resolvedFieldDef?.type || "text";
  const isPrimary = Boolean(isTitle || column?.isTitle);
  const isStatusColumn =
    String(column?.key || "").toLowerCase() === "status" ||
    String(type || "").toLowerCase() === "status";

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
      }
    : {};

  return (
    <div className="view-engine-table-data-cell" style={viewEngineCellWrapperStyle}>
      <div
        className={
          isPrimary
            ? "view-engine-table-cell-inner is-title"
            : "view-engine-table-cell-inner"
        }
      >
        {isStatusColumn ? (
          <span
            className="view-engine-table-status-badge"
            title={value != null && value !== "" ? String(value) : undefined}
          >
            {value != null && value !== "" ? String(value) : emptyValue}
          </span>
        ) : (
          <FieldValueRenderer
            type={type}
            value={value}
            column={rendererColumn}
            row={rendererRow}
            compact={compact}
            multiline={multiline}
            emptyValue={emptyValue}
            {...contextProps}
          />
        )}
      </div>
    </div>
  );
}
