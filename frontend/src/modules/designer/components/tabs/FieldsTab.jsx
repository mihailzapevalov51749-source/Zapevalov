import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import PropertiesPanel from "../common/PropertiesPanel";

const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "datetime",
  "choice",
  "multi_choice",
  "uuid",
];

export default function FieldsTab({ tenantId, objectTypeId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const selected = items.find((item) => item.id === selectedId) || null;

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await designerApi.listFields(tenantId, objectTypeId);
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить поля"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, objectTypeId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }

    setDraft({
      name: selected.name,
      key: selected.key,
      field_type: selected.field_type,
      is_required: selected.is_required,
      is_unique: selected.is_unique,
      description: selected.description || "",
    });
  }, [selected]);

  const handleCreate = async () => {
    const name = window.prompt("Название поля", "Новое поле");
    if (!name) return;

    const key = window.prompt("Key поля", "new_field");
    if (!key) return;

    try {
      await designerApi.createField(tenantId, objectTypeId, {
        name,
        key,
        field_type: "text",
        is_required: false,
        is_unique: false,
      });
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось создать поле"));
    }
  };

  const handleSave = async () => {
    if (!selected || !draft) return;

    setSaving(true);

    try {
      await designerApi.updateField(tenantId, objectTypeId, selected.id, {
        name: draft.name,
        field_type: draft.field_type,
        is_required: draft.is_required,
        is_unique: draft.is_unique,
        description: draft.description,
      });
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось сохранить поле"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Удалить поле "${selected.name}"?`)) return;

    try {
      await designerApi.deleteField(tenantId, objectTypeId, selected.id);
      setSelectedId(null);
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось удалить поле"));
    }
  };

  if (loading) return <div className="designer-loading">Загрузка полей...</div>;
  if (error) return <div className="designer-error">{error}</div>;

  return (
    <div
      className={`designer-workspace-layout ${
        selected ? "has-panel" : ""
      }`}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>
            Поля объекта <span className="designer-badge">{items.length}</span>
          </h3>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            onClick={handleCreate}
          >
            + Добавить поле
          </button>
        </div>

        <div className="designer-table-wrap">
          <table className="designer-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Key</th>
                <th>Тип</th>
                <th>Обязательное</th>
                <th>Уникальное</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={item.id === selectedId ? "is-selected" : ""}
                  onClick={() => setSelectedId(item.id)}
                >
                  <td>{item.name}</td>
                  <td>
                    <code>{item.key}</code>
                  </td>
                  <td>{item.field_type}</td>
                  <td>{item.is_required ? "Да" : "Нет"}</td>
                  <td>{item.is_unique ? "Да" : "Нет"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && draft ? (
        <PropertiesPanel
          title="Свойства поля"
          onClose={() => setSelectedId(null)}
          footer={
            <>
              <button
                type="button"
                className="designer-btn designer-btn--danger"
                onClick={handleDelete}
              >
                Удалить поле
              </button>
              <button
                type="button"
                className="designer-btn designer-btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </>
          }
        >
          <label className="designer-label">Название</label>
          <input
            className="designer-input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div style={{ height: 10 }} />
          <label className="designer-label">Key</label>
          <input className="designer-input" value={draft.key} disabled />
          <div style={{ height: 10 }} />
          <label className="designer-label">Тип поля</label>
          <select
            className="designer-select"
            value={draft.field_type}
            onChange={(e) => setDraft({ ...draft, field_type: e.target.value })}
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <div style={{ height: 10 }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={draft.is_required}
              onChange={(e) =>
                setDraft({ ...draft, is_required: e.target.checked })
              }
            />
            Обязательное поле
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={draft.is_unique}
              onChange={(e) =>
                setDraft({ ...draft, is_unique: e.target.checked })
              }
            />
            Уникальное поле
          </label>
          <div style={{ height: 10 }} />
          <label className="designer-label">Описание</label>
          <textarea
            className="designer-textarea"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </PropertiesPanel>
      ) : null}
    </div>
  );
}
