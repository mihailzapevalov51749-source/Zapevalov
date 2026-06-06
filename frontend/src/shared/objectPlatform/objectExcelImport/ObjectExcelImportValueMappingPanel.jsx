import { useMemo } from "react";

import { IMPORT_VALUE_SKIP_OPTION, VALUE_MAPPING_SECTION_LABELS } from "../services/import/valueMapping/importValueMappingConstants.js";
import {
  getChoiceMappingOptions,
  withSkipMappingOption,
} from "../services/import/valueMapping/resolveImportValueCandidates.js";
import { updateImportValueMappingRule } from "../services/import/valueMapping/applyImportValueMappings.js";

const SECTION_ORDER = ["status", "list", "user"];

/**
 * @param {{
 *   rules: Array<Record<string, unknown>>,
 *   importableFields: Array<Record<string, unknown>>,
 *   userOptions: Array<{ value: number, label: string }>,
 *   onRulesChange: (rules: Array<Record<string, unknown>>) => void,
 * }} props
 */
export default function ObjectExcelImportValueMappingPanel({
  rules = [],
  importableFields = [],
  userOptions = [],
  onRulesChange,
}) {
  const fieldByKey = useMemo(
    () =>
      new Map(
        importableFields.map((field) => [
          String(field.key || "").trim(),
          field,
        ]),
      ),
    [importableFields],
  );

  const unresolvedBySection = useMemo(() => {
    const unresolved = (Array.isArray(rules) ? rules : []).filter(
      (rule) =>
        !rule?.skip &&
        (rule?.resolvedValue === null ||
          rule?.resolvedValue === undefined ||
          rule?.resolvedValue === ""),
    );

    return SECTION_ORDER.map((section) => ({
      section,
      label: VALUE_MAPPING_SECTION_LABELS[section],
      items: unresolved.filter((rule) => rule.section === section),
    })).filter((group) => group.items.length > 0);
  }, [rules]);

  if (!unresolvedBySection.length) {
    return (
      <p className="object-excel-import__value-mapping-empty">
        Все значения сопоставлены автоматически.
      </p>
    );
  }

  return (
    <div className="object-excel-import__value-mapping">
      {unresolvedBySection.map((group) => (
        <section key={group.section} className="object-excel-import__value-mapping-section">
          <h3 className="object-excel-import__value-mapping-title">{group.label}</h3>
          <div className="object-excel-import__table-wrap">
            <table className="object-excel-import__table">
              <thead>
                <tr>
                  <th>Значение Excel</th>
                  <th>Поле</th>
                  <th>Сопоставить с</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((rule) => {
                  const field = fieldByKey.get(String(rule.fieldKey || "").trim());
                  const options =
                    group.section === "user"
                      ? withSkipMappingOption(userOptions)
                      : withSkipMappingOption(getChoiceMappingOptions(field));

                  const selectedValue =
                    rule.skip
                      ? IMPORT_VALUE_SKIP_OPTION
                      : rule.resolvedValue ?? "";

                  return (
                    <tr key={rule.id}>
                      <td>{rule.excelValue}</td>
                      <td>{rule.fieldLabel}</td>
                      <td>
                        <select
                          className="object-excel-import__select"
                          value={String(selectedValue)}
                          onChange={(event) =>
                            onRulesChange?.(
                              updateImportValueMappingRule(
                                rules,
                                rule.id,
                                event.target.value,
                              ),
                            )
                          }
                        >
                          <option value="">Выберите значение</option>
                          {options.map((option) => (
                            <option key={`${rule.id}-${option.value}`} value={String(option.value)}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
