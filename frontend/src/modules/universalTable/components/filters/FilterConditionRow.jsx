import FilterValueControl from "./FilterValueControl";

import {
  conditionRowStyle,
  operatorSelectStyle,
  removeButtonStyle,
  selectStyle,
} from "./filterModalStyles";

import {
  getOperatorsByColumn,
  isOperatorValueDisabled,
} from "../../services/tableFilterOperators";

import { getColumnId, getColumnTitle } from "../../services/tableFilterUtils";

export default function FilterConditionRow({
  condition,
  columns = [],
  rows = [],
  hasColumns,
  users = [],
  isUsersLoading = false,
  usersError = "",
  onChange,
  onRemove,
}) {
  const selectedColumn = columns.find(
    (column) => getColumnId(column) === String(condition.columnId)
  );

  const operators = getOperatorsByColumn(selectedColumn);
  const isValueDisabled = isOperatorValueDisabled(
    selectedColumn,
    condition.operator
  );

  return (
    <div style={conditionRowStyle}>
      <select
        value={condition.columnId}
        disabled={!hasColumns}
        onChange={(event) =>
          onChange?.(condition.id, "columnId", event.target.value)
        }
        style={{
          ...selectStyle,
          opacity: hasColumns ? 1 : 0.55,
          cursor: hasColumns ? "pointer" : "default",
        }}
      >
        {hasColumns ? (
          columns.map((column) => (
            <option key={getColumnId(column)} value={getColumnId(column)}>
              {getColumnTitle(column)}
            </option>
          ))
        ) : (
          <option value="">Нет колонок</option>
        )}
      </select>

      <select
        value={condition.operator}
        disabled={!hasColumns}
        onChange={(event) =>
          onChange?.(condition.id, "operator", event.target.value)
        }
        style={{
          ...operatorSelectStyle,
          opacity: hasColumns ? 1 : 0.55,
          cursor: hasColumns ? "pointer" : "default",
        }}
      >
        {operators.map((operator) => (
          <option key={operator.key} value={operator.key}>
            {operator.label}
          </option>
        ))}
      </select>

      <FilterValueControl
        condition={condition}
        column={selectedColumn}
        rows={rows}
        hasColumns={hasColumns}
        isValueDisabled={isValueDisabled}
        users={users}
        isUsersLoading={isUsersLoading}
        usersError={usersError}
        onChange={onChange}
      />

      <button
        type="button"
        disabled={!hasColumns}
        onClick={() => onRemove?.(condition.id)}
        style={{
          ...removeButtonStyle,
          opacity: hasColumns ? 1 : 0.55,
          cursor: hasColumns ? "pointer" : "default",
        }}
        title="Удалить условие"
      >
        ×
      </button>
    </div>
  );
}