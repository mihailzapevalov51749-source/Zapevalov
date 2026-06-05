import { useEffect, useMemo, useState } from "react";

import UserPicker from "../../../../../shared/users/UserPicker";
import {
  findPickerUserById,
  loadPickerUsers,
} from "../../../../../shared/users/userPickerUtils";
import {
  DEFAULT_VALUE_CONSTANT,
  DEFAULT_VALUE_FALSE,
  DEFAULT_VALUE_NOW_PLUS_HOURS,
  DEFAULT_VALUE_OPTION,
  DEFAULT_VALUE_SPECIFIC_DATE,
  DEFAULT_VALUE_SPECIFIC_DATETIME,
  DEFAULT_VALUE_SPECIFIC_RECORD,
  DEFAULT_VALUE_SPECIFIC_USER,
  DEFAULT_VALUE_TODAY_PLUS_DAYS,
  DEFAULT_VALUE_TRUE,
  defaultValueRequiresValueInput,
  getDefaultValueTypeOptions,
  isDefaultValueEditorVisible,
} from "./defaultValueRegistry";
import RelationDefaultRecordPicker from "./RelationDefaultRecordPicker";

import "./defaultValueEditor.css";

export default function DefaultValueEditor({
  fieldType,
  value,
  onChange,
  choiceOptions = [],
  tenantId = null,
  objectTypeId = null,
  relationDefinitions = [],
  relationKey = "",
  relationRole = "",
}) {
  const normalizedType = String(fieldType || "").trim().toLowerCase();
  const draft = value || { type: "none", value: null };
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const typeOptions = useMemo(
    () => getDefaultValueTypeOptions(normalizedType, { choiceOptions }),
    [normalizedType, choiceOptions],
  );

  const showValueInput = defaultValueRequiresValueInput(draft.type);
  const choiceOptionsEmpty =
    (normalizedType === "choice" || normalizedType === "multi_choice") &&
    (!Array.isArray(choiceOptions) || choiceOptions.length === 0);

  useEffect(() => {
    if (draft.type !== DEFAULT_VALUE_SPECIFIC_USER) {
      return undefined;
    }

    let mounted = true;

    const load = async () => {
      setUsersLoading(true);

      try {
        const list = await loadPickerUsers();

        if (mounted) {
          setUsers(list);
        }
      } finally {
        if (mounted) {
          setUsersLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [draft.type]);

  if (!isDefaultValueEditorVisible(normalizedType)) {
    return null;
  }

  if (normalizedType === "boolean") {
    const selected = draft.type === DEFAULT_VALUE_TRUE ? DEFAULT_VALUE_TRUE : DEFAULT_VALUE_FALSE;

    return (
      <section className="designer-default-value">
        <h5 className="designer-default-value__title">Значение по умолчанию</h5>
        <div className="designer-default-value__boolean-group" role="radiogroup">
          <label className="designer-field-form__checkbox">
            <input
              type="radio"
              name="default-boolean"
              checked={selected === DEFAULT_VALUE_TRUE}
              onChange={() => onChange?.({ type: DEFAULT_VALUE_TRUE, value: null })}
            />
            Да
          </label>
          <label className="designer-field-form__checkbox">
            <input
              type="radio"
              name="default-boolean"
              checked={selected === DEFAULT_VALUE_FALSE}
              onChange={() => onChange?.({ type: DEFAULT_VALUE_FALSE, value: null })}
            />
            Нет
          </label>
        </div>
      </section>
    );
  }

  return (
    <section className="designer-default-value">
      <h5 className="designer-default-value__title">Значение по умолчанию</h5>

      <div className="designer-field-form__group">
        <label className="designer-label" htmlFor="field-default-type">
          Тип
        </label>
        <select
          id="field-default-type"
          className="designer-select"
          value={draft.type}
          onChange={(event) => {
            const nextType = event.target.value;
            onChange?.({
              type: nextType,
              value: defaultValueRequiresValueInput(nextType) ? draft.value : null,
            });
          }}
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {choiceOptionsEmpty ? (
        <p className="designer-field-form__hint">Сначала добавьте варианты списка.</p>
      ) : null}

      {showValueInput ? (
        <div className="designer-field-form__group">
          <label className="designer-label" htmlFor="field-default-value">
            Значение
          </label>

          {draft.type === DEFAULT_VALUE_CONSTANT && normalizedType === "number" ? (
            <input
              id="field-default-value"
              className="designer-input"
              type="number"
              value={draft.value ?? ""}
              onChange={(event) =>
                onChange?.({ ...draft, value: event.target.value })
              }
            />
          ) : null}

          {draft.type === DEFAULT_VALUE_CONSTANT &&
          (normalizedType === "text" || normalizedType === "textarea" || normalizedType === "uuid") ? (
            <input
              id="field-default-value"
              className="designer-input"
              type="text"
              value={draft.value ?? ""}
              onChange={(event) =>
                onChange?.({ ...draft, value: event.target.value })
              }
            />
          ) : null}

          {draft.type === DEFAULT_VALUE_OPTION ? (
            <select
              id="field-default-value"
              className="designer-select"
              value={String(draft.value || "")}
              onChange={(event) =>
                onChange?.({ ...draft, value: event.target.value })
              }
            >
              <option value="">Выберите вариант</option>
              {(choiceOptions || []).map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label || option.key}
                </option>
              ))}
            </select>
          ) : null}

          {draft.type === DEFAULT_VALUE_SPECIFIC_USER ? (
            <UserPicker
              users={users}
              isLoading={usersLoading}
              selectedUserId={draft.value}
              selectedUser={findPickerUserById(users, draft.value)}
              onSelect={(user) =>
                onChange?.({
                  ...draft,
                  value: user?.id ?? null,
                })
              }
            />
          ) : null}

          {draft.type === DEFAULT_VALUE_TODAY_PLUS_DAYS ||
          draft.type === DEFAULT_VALUE_NOW_PLUS_HOURS ? (
            <input
              id="field-default-value"
              className="designer-input"
              type="number"
              min="0"
              step="1"
              value={draft.value ?? ""}
              onChange={(event) =>
                onChange?.({ ...draft, value: event.target.value })
              }
            />
          ) : null}

          {draft.type === DEFAULT_VALUE_SPECIFIC_DATE ? (
            <input
              id="field-default-value"
              className="designer-input"
              type="date"
              value={draft.value ?? ""}
              onChange={(event) =>
                onChange?.({ ...draft, value: event.target.value })
              }
            />
          ) : null}

          {draft.type === DEFAULT_VALUE_SPECIFIC_DATETIME ? (
            <input
              id="field-default-value"
              className="designer-input"
              type="datetime-local"
              value={draft.value ?? ""}
              onChange={(event) =>
                onChange?.({ ...draft, value: event.target.value })
              }
            />
          ) : null}

          {draft.type === DEFAULT_VALUE_SPECIFIC_RECORD ? (
            <RelationDefaultRecordPicker
              tenantId={tenantId}
              objectTypeId={objectTypeId}
              relationDefinitions={relationDefinitions}
              relationKey={relationKey}
              relationRole={relationRole}
              value={draft.value}
              onChange={(nextValue) => onChange?.({ ...draft, value: nextValue })}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
