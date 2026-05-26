import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import PropertiesPanel from "../common/PropertiesPanel";

export default function RelationsTab({ tenantId, objectTypeId, objectType }) {
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
      const data = await designerApi.listRelations(tenantId, objectTypeId);
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить связи"));
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
      relation_type: selected.relation_type,
      is_active: selected.is_active,
      description: selected.description || "",
    });
  }, [selected]);

  const handleCreate = async () => {
    const name = window.prompt("Название связи", "Новая связь");
    if (!name) return;

    const key = window.prompt("Key связи", "new_relation");
    if (!key) return;

    const targetId = window.prompt("Target object_type_id (UUID)");
    if (!targetId) return;

    try {
      await designerApi.createRelation(tenantId, {
        name,
        key,
        source_object_type_id: objectTypeId,
        target_object_type_id: targetId,
        relation_type: "many_to_many",
        is_active: true,
        bidirectional: true,
      });
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось создать связь"));
    }
  };

  const handleSave = async () => {
    if (!selected || !draft) return;

    setSaving(true);

    try {
      await designerApi.updateRelation(tenantId, selected.id, {
        name: draft.name,
        relation_type: draft.relation_type,
        is_active: draft.is_active,
        description: draft.description,
      });
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось сохранить связь"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Удалить связь "${selected.name}"?`)) return;

    try {
      await designerApi.deleteRelation(tenantId, selected.id);
      setSelectedId(null);
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось удалить связь"));
    }
  };

  if (loading) return <div className="designer-loading">Загрузка связей...</div>;
  if (error) return <div className="designer-error">{error}</div>;

  return (
    <div className={`designer-workspace-layout ${selected ? "has-panel" : ""}`}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>
            Список связей <span className="designer-badge">{items.length}</span>
          </h3>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            onClick={handleCreate}
          >
            + Добавить связь
          </button>
        </div>

        <div className="designer-card" style={{ marginBottom: 12, fontSize: 13, color: "#64748b" }}>
          Граф связей в MVP отключён. Источник: <code>{objectType?.key}</code>
        </div>

        <div className="designer-table-wrap">
          <table className="designer-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Key</th>
                <th>От</th>
                <th>К</th>
                <th>Тип</th>
                <th>Активна</th>
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
                  <td>{item.source_object_type_key || item.source_object_type_id}</td>
                  <td>{item.target_object_type_key || item.target_object_type_id}</td>
                  <td>{item.relation_type}</td>
                  <td>{item.is_active ? "Да" : "Нет"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && draft ? (
        <PropertiesPanel
          title="Свойства связи"
          onClose={() => setSelectedId(null)}
          footer={
            <>
              <button
                type="button"
                className="designer-btn designer-btn--danger"
                onClick={handleDelete}
              >
                Удалить связь
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
          <label className="designer-label">Тип связи</label>
          <select
            className="designer-select"
            value={draft.relation_type}
            onChange={(e) =>
              setDraft({ ...draft, relation_type: e.target.value })
            }
          >
            <option value="one_to_one">one_to_one</option>
            <option value="one_to_many">one_to_many</option>
            <option value="many_to_one">many_to_one</option>
            <option value="many_to_many">many_to_many</option>
          </select>
          <div style={{ height: 10 }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) =>
                setDraft({ ...draft, is_active: e.target.checked })
              }
            />
            Активная связь
          </label>
          <div style={{ height: 10 }} />
          <label className="designer-label">Описание</label>
          <textarea
            className="designer-textarea"
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </PropertiesPanel>
      ) : null}
    </div>
  );
}
