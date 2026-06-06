import {
  IMPORT_DATA_SOURCE_DEFAULT_VALUE,
  IMPORT_DATA_SOURCE_EXCEL_COLUMN,
  IMPORT_DEFAULT_CURRENT_USER_LABEL,
  IMPORT_DEFAULT_CURRENT_USER_VALUE,
} from "../services/import/defaultValues/importDefaultValueConstants.js";
import {
  isFieldMappedToExcelColumn,
  resolveMappedExcelColumnLabel,
} from "../services/import/defaultValues/isFieldMappedToExcelColumn.js";
import { resolveImportDefaultValueEditor } from "../services/import/defaultValues/resolveImportDefaultValueEditor.js";
import { updateImportDefaultValueRule } from "../services/import/defaultValues/updateImportDefaultValueRule.js";
import { getChoiceMappingOptions } from "../services/import/valueMapping/resolveImportValueCandidates.js";

/**
 * @param {{
 *   rules: Array<Record<string, unknown>>,
 *   importableFields: Array<Record<string, unknown>>,
 *   mappings: Array<{ columnIndex: number, excelHeader: string, fieldKey?: string }>,
 *   userOptions: Array<{ value: number, label: string }>,
 *   warnings?: string[],
 *   onRulesChange: (rules: Array<Record<string, unknown>>) => void,
 *   onAssignExcelColumn: (fieldKey: string, columnIndex: number) => void,
 * }} props
 */
export default function ObjectExcelImportDefaultValuesPanel({
  rules = [],
  importableFields = [],
  mappings = [],
  userOptions = [],
  warnings = [],
  onRulesChange,
  onAssignExcelColumn,
}) {
  const fieldByKey = new Map(
    importableFields.map((field) => [String(field.key || "").trim(), field]),
  );

  if (!rules.length) {
    return null;
  }

  return (
    <div className="object-excel-import__default-values">
      <p className="object-excel-import__default-values-title">Обязательные поля</p>
      <p className="object-excel-import__default-values-hint">
        Укажите источник данных для каждого обязательного поля.
      </p>

      {warnings.length ? (
        <div className="object-excel-import__default-values-warnings">
          {warnings.map((warning) => (
            <p key={warning} className="object-excel-import__default-values-warning">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {rules.map((rule) => {
        const field = fieldByKey.get(String(rule.fieldKey || "").trim());
        const editorKind = resolveImportDefaultValueEditor(field);
        const mappedColumn = resolveMappedExcelColumnLabel(rule.fieldKey, mappings);
        const mappedColumnIndex = mappings.find(
          (mapping) => String(mapping.fieldKey || "").trim() === String(rule.fieldKey || "").trim(),
        )?.columnIndex;
        const source = String(rule.source || IMPORT_DATA_SOURCE_EXCEL_COLUMN);
        const supportsDefaultValue = Boolean(rule.supportsDefaultValue);

        return (
          <div key={rule.fieldKey} className="object-excel-import__default-value-card">
            <div className="object-excel-import__default-value-header">
              <span className="object-excel-import__default-value-label">{rule.fieldLabel}</span>
              <span className="object-excel-import__default-value-badge">обязательное</span>
            </div>

            <div className="object-excel-import__default-value-sources">
              <label className="object-excel-import__default-value-source">
                <input
                  type="radio"
                  name={`import-source-${rule.fieldKey}`}
                  checked={source === IMPORT_DATA_SOURCE_EXCEL_COLUMN}
                  onChange={() =>
                    onRulesChange(
                      updateImportDefaultValueRule(rules, rule.fieldKey, {
                        source: IMPORT_DATA_SOURCE_EXCEL_COLUMN,
                      }),
                    )
                  }
                />
                <span>Колонка Excel</span>
              </label>

              {supportsDefaultValue ? (
                <label className="object-excel-import__default-value-source">
                  <input
                    type="radio"
                    name={`import-source-${rule.fieldKey}`}
                    checked={source === IMPORT_DATA_SOURCE_DEFAULT_VALUE}
                    onChange={() =>
                      onRulesChange(
                        updateImportDefaultValueRule(rules, rule.fieldKey, {
                          source: IMPORT_DATA_SOURCE_DEFAULT_VALUE,
                        }),
                      )
                    }
                  />
                  <span>Значение по умолчанию</span>
                </label>
              ) : null}
            </div>

            {source === IMPORT_DATA_SOURCE_EXCEL_COLUMN ? (
              <div className="object-excel-import__default-value-editor">
                <label
                  className="object-excel-import__default-value-editor-label"
                  htmlFor={`import-excel-column-${rule.fieldKey}`}
                >
                  Колонка:
                </label>
                <select
                  id={`import-excel-column-${rule.fieldKey}`}
                  className="object-excel-import__select"
                  value={
                    mappedColumnIndex !== undefined && mappedColumnIndex !== null
                      ? mappedColumnIndex
                      : ""
                  }
                  onChange={(event) => {
                    const nextColumnIndex = event.target.value;

                    if (!nextColumnIndex) {
                      return;
                    }

                    onAssignExcelColumn(rule.fieldKey, Number(nextColumnIndex));
                  }}
                >
                  <option value="">Выберите колонку Excel</option>
                  {mappings.map((mapping) => (
                    <option key={mapping.columnIndex} value={mapping.columnIndex}>
                      {mapping.excelHeader}
                    </option>
                  ))}
                </select>
                {!isFieldMappedToExcelColumn(rule.fieldKey, mappings) ? (
                  <span className="object-excel-import__default-value-column-hint">
                    {mappedColumn || "Колонка не выбрана"}
                  </span>
                ) : null}
              </div>
            ) : null}

            {source === IMPORT_DATA_SOURCE_DEFAULT_VALUE && supportsDefaultValue ? (
              <div className="object-excel-import__default-value-editor">
                <label
                  className="object-excel-import__default-value-editor-label"
                  htmlFor={`import-default-${rule.fieldKey}`}
                >
                  Значение:
                </label>
                {editorKind === "user" ? (
                  <select
                    id={`import-default-${rule.fieldKey}`}
                    className="object-excel-import__select"
                    value={rule.defaultValue ?? ""}
                    onChange={(event) =>
                      onRulesChange(
                        updateImportDefaultValueRule(rules, rule.fieldKey, {
                          defaultValue: event.target.value
                            ? event.target.value === IMPORT_DEFAULT_CURRENT_USER_VALUE
                              ? IMPORT_DEFAULT_CURRENT_USER_VALUE
                              : Number(event.target.value)
                            : "",
                        }),
                      )
                    }
                  >
                    <option value="">Выберите пользователя</option>
                    <option value={IMPORT_DEFAULT_CURRENT_USER_VALUE}>
                      {IMPORT_DEFAULT_CURRENT_USER_LABEL}
                    </option>
                    {userOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}

                {editorKind === "status" || editorKind === "choice" ? (
                  <select
                    id={`import-default-${rule.fieldKey}`}
                    className="object-excel-import__select"
                    value={rule.defaultValue ?? ""}
                    onChange={(event) =>
                      onRulesChange(
                        updateImportDefaultValueRule(rules, rule.fieldKey, {
                          defaultValue: event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      {editorKind === "status" ? "Выберите статус" : "Выберите значение списка"}
                    </option>
                    {getChoiceMappingOptions(field).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}

                {editorKind === "number" ? (
                  <input
                    id={`import-default-${rule.fieldKey}`}
                    className="object-excel-import__input"
                    type="number"
                    value={rule.defaultValue ?? ""}
                    onChange={(event) =>
                      onRulesChange(
                        updateImportDefaultValueRule(rules, rule.fieldKey, {
                          defaultValue: event.target.value,
                        }),
                      )
                    }
                  />
                ) : null}

                {editorKind === "date" ? (
                  <input
                    id={`import-default-${rule.fieldKey}`}
                    className="object-excel-import__input"
                    type="date"
                    value={rule.defaultValue ?? ""}
                    onChange={(event) =>
                      onRulesChange(
                        updateImportDefaultValueRule(rules, rule.fieldKey, {
                          defaultValue: event.target.value,
                        }),
                      )
                    }
                  />
                ) : null}

                {editorKind === "text" ? (
                  <input
                    id={`import-default-${rule.fieldKey}`}
                    className="object-excel-import__input"
                    type="text"
                    value={rule.defaultValue ?? ""}
                    onChange={(event) =>
                      onRulesChange(
                        updateImportDefaultValueRule(rules, rule.fieldKey, {
                          defaultValue: event.target.value,
                        }),
                      )
                    }
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
