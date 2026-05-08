import { useEffect, useState } from "react";

import { getLookupOptions } from "../../services/tableApi";
import { cellInputStyle } from "../../styles/tableStyles";

const CELL_EDITOR_HEIGHT = 28;

const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

const getJustifyByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

const normalizeLookupValue = (value) => {
  if (value && typeof value === "object") {
    return {
      rowId: value.rowId ?? value.row_id ?? value.id ?? value.value ?? null,
    };
  }

  if (value) {
    return {
      rowId: value,
    };
  }

  return {
    rowId: null,
  };
};

const normalizeLookupOption = (option) => {
  const rowId =
    option?.row_id ??
    option?.rowId ??
    option?.id ??
    option?.value ??
    null;

  return {
    row_id: rowId,
    label: option?.label ?? option?.title ?? option?.name ?? "",
  };
};

export default function LookupCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
  isPrimary = false,
}) {
  const [lookupOptions, setLookupOptions] = useState([]);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);
  const fontWeight = isPrimary ? 700 : 400;

  const commonInputStyle = {
    ...cellInputStyle,
    width: "100%",
    height: CELL_EDITOR_HEIGHT,
    minHeight: CELL_EDITOR_HEIGHT,
    maxHeight: CELL_EDITOR_HEIGHT,
    border: "none",
    outline: "none",
    background: "transparent",
    textAlign: align,
    fontWeight,
    color: "#0f172a",
    fontSize: 13,
    lineHeight: `${CELL_EDITOR_HEIGHT}px`,
    padding: "0 6px",
    boxSizing: "border-box",
  };

  const readonlyCellStyle = {
    width: "100%",
    height: CELL_EDITOR_HEIGHT,
    minHeight: CELL_EDITOR_HEIGHT,
    maxHeight: CELL_EDITOR_HEIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent,
    padding: "0 6px",
    boxSizing: "border-box",
    fontSize: 13,
    lineHeight: `${CELL_EDITOR_HEIGHT}px`,
    fontWeight,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    cursor: "default",
    textAlign: align,
  };

  useEffect(() => {
    const sourceTableId = column?.lookup?.sourceTableId;
    const displayColumnId = column?.lookup?.displayColumnId;

    if (!sourceTableId || !displayColumnId) {
      setLookupOptions([]);
      return;
    }

    let isMounted = true;

    const loadLookupOptions = async () => {
      try {
        setIsLookupLoading(true);

        const data = await getLookupOptions(sourceTableId, displayColumnId);

        if (isMounted) {
          const normalizedOptions = Array.isArray(data)
            ? data
                .map(normalizeLookupOption)
                .filter((option) => option.row_id !== null)
            : [];

          setLookupOptions(normalizedOptions);
        }
      } catch (error) {
        console.error("Ошибка загрузки подстановки:", error);

        if (isMounted) {
          setLookupOptions([]);
        }
      } finally {
        if (isMounted) {
          setIsLookupLoading(false);
        }
      }
    };

    loadLookupOptions();

    return () => {
      isMounted = false;
    };
  }, [column?.lookup?.sourceTableId, column?.lookup?.displayColumnId]);

  const lookupValue = normalizeLookupValue(value);

  const selectedOption = lookupOptions.find(
    (option) => String(option.row_id) === String(lookupValue.rowId)
  );

  const displayLabel =
    selectedOption?.label ||
    (lookupValue.rowId ? `Строка ${lookupValue.rowId}` : "");

  if (readOnly) {
    return (
      <div
        data-table-action="true"
        title={displayLabel}
        style={{
          ...readonlyCellStyle,
          color: displayLabel ? "#0f172a" : "#94a3b8",
        }}
      >
        <span
          style={{
            minWidth: 0,
            maxWidth: "100%",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            textAlign: align,
          }}
        >
          {isLookupLoading && !displayLabel
            ? "Загрузка..."
            : displayLabel || "—"}
        </span>
      </div>
    );
  }

  const safeValue = lookupValue.rowId ? String(lookupValue.rowId) : "";

  return (
    <select
      data-table-action="true"
      value={safeValue}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) =>
        onChange?.({
          rowId: event.target.value ? Number(event.target.value) : null,
        })
      }
      style={commonInputStyle}
    >
      <option value="">
        {isLookupLoading ? "Загрузка..." : "Не выбрано"}
      </option>

      {lookupValue.rowId && !selectedOption && (
        <option value={String(lookupValue.rowId)}>
          Выбрано: строка #{lookupValue.rowId}
        </option>
      )}

      {lookupOptions.map((option) => (
        <option key={String(option.row_id)} value={String(option.row_id)}>
          {option.label || `Строка ${option.row_id}`}
        </option>
      ))}
    </select>
  );
}