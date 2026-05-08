import { useEffect, useState } from "react";

import UserSearchControl from "./UserSearchControl";

import { inputStyle, selectStyle } from "./filterModalStyles";

import { SELECT_TYPES } from "../../services/tableFilterOperators";

import { getColumnOptions } from "../../services/tableFilterUtils";
import { getLookupOptions } from "../../services/tableApi";

export const EMPTY_LOOKUP_VALUE = "__EMPTY_LOOKUP__";

function normalizeColumnType(type) {
  return String(type || "text").toLowerCase();
}

function normalizeLookupOption(option) {
  const rowId =
    option?.row_id ?? option?.rowId ?? option?.id ?? option?.value ?? null;

  return {
    value: rowId === null || rowId === undefined ? "" : String(rowId),
    label:
      option?.label ??
      option?.title ??
      option?.name ??
      option?.displayValue ??
      option?.display_value ??
      (rowId ? `Строка ${rowId}` : ""),
  };
}

export default function FilterValueControl({
  condition,
  column,
  rows = [],
  hasColumns,
  isValueDisabled,
  users = [],
  isUsersLoading = false,
  usersError = "",
  onChange,
}) {
  const type = normalizeColumnType(column?.type);
  const options = getColumnOptions(column);
  const isSelectType = SELECT_TYPES.includes(type);

  const [lookupOptions, setLookupOptions] = useState([]);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  useEffect(() => {
    if (type !== "lookup") {
      setLookupOptions([]);
      setIsLookupLoading(false);
      return;
    }

    const sourceTableId = column?.lookup?.sourceTableId;
    const displayColumnId = column?.lookup?.displayColumnId;

    if (!sourceTableId || !displayColumnId) {
      setLookupOptions([]);
      setIsLookupLoading(false);
      return;
    }

    let isMounted = true;

    const loadLookupFilterOptions = async () => {
      try {
        setIsLookupLoading(true);

        const data = await getLookupOptions(sourceTableId, displayColumnId);

        if (!isMounted) return;

        const normalizedOptions = Array.isArray(data)
          ? data.map(normalizeLookupOption).filter((option) => option.value)
          : [];

        setLookupOptions(normalizedOptions);
      } catch (error) {
        console.error("Ошибка загрузки значений подстановки для фильтра:", error);

        if (isMounted) {
          setLookupOptions([]);
        }
      } finally {
        if (isMounted) {
          setIsLookupLoading(false);
        }
      }
    };

    loadLookupFilterOptions();

    return () => {
      isMounted = false;
    };
  }, [
    type,
    column?.lookup?.sourceTableId,
    column?.lookup?.displayColumnId,
  ]);

  if (isValueDisabled) {
    return (
      <input
        value=""
        disabled
        placeholder="Не требуется"
        style={{
          ...inputStyle,
          opacity: 0.55,
          cursor: "default",
          background: "#f8fafc",
        }}
      />
    );
  }

  if (type === "user") {
    return (
      <UserSearchControl
        users={users}
        value={condition.value}
        disabled={!hasColumns}
        isLoading={isUsersLoading}
        error={usersError}
        onChange={(value) => onChange?.(condition.id, "value", value)}
      />
    );
  }

  if (type === "lookup") {
    return (
      <select
        value={condition.value ?? ""}
        disabled={!hasColumns || isLookupLoading}
        onChange={(event) =>
          onChange?.(condition.id, "value", event.target.value)
        }
        style={{
          ...selectStyle,
          opacity: hasColumns && !isLookupLoading ? 1 : 0.55,
          cursor: hasColumns && !isLookupLoading ? "pointer" : "default",
        }}
      >
        <option value="">
          {isLookupLoading ? "Загрузка..." : "Выберите значение"}
        </option>

        <option value={EMPTY_LOOKUP_VALUE}>Не выбрано</option>

        {lookupOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label || `Строка ${option.value}`}
          </option>
        ))}
      </select>
    );
  }

  if (isSelectType && options.length) {
    return (
      <select
        value={condition.value}
        disabled={!hasColumns}
        onChange={(event) =>
          onChange?.(condition.id, "value", event.target.value)
        }
        style={{
          ...selectStyle,
          opacity: hasColumns ? 1 : 0.55,
          cursor: hasColumns ? "pointer" : "default",
        }}
      >
        <option value="">Выберите значение</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === "date" || type === "datetime") {
    return (
      <input
        type="date"
        value={condition.value}
        disabled={!hasColumns}
        onChange={(event) =>
          onChange?.(condition.id, "value", event.target.value)
        }
        style={{
          ...inputStyle,
          opacity: hasColumns ? 1 : 0.55,
          cursor: hasColumns ? "text" : "default",
        }}
      />
    );
  }

  if (type === "number") {
    return (
      <input
        type="number"
        value={condition.value}
        disabled={!hasColumns}
        onChange={(event) =>
          onChange?.(condition.id, "value", event.target.value)
        }
        placeholder="Значение"
        style={{
          ...inputStyle,
          opacity: hasColumns ? 1 : 0.55,
          cursor: hasColumns ? "text" : "default",
        }}
      />
    );
  }

  return (
    <input
      value={condition.value}
      disabled={!hasColumns}
      onChange={(event) =>
        onChange?.(condition.id, "value", event.target.value)
      }
      placeholder="Значение"
      style={{
        ...inputStyle,
        opacity: hasColumns ? 1 : 0.55,
        cursor: hasColumns ? "text" : "default",
      }}
    />
  );
}