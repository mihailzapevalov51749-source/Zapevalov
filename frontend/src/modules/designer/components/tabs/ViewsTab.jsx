import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import PropertiesPanel from "../common/PropertiesPanel";

const VIEW_TYPES = ["table", "form", "card", "list"];

export default function ViewsTab({ tenantId, objectTypeId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);

  const navigate = useNavigate();

  const selected = items.find((item) => item.id === selectedId) || null;
  const isSelectedSystemDefault = Boolean(selected?.is_system && selected?.is_default);

  const fieldOptions = useMemo(() => {
    return (fields || []).map((f) => ({
      key: f.key,
      name: f.name || f.key,
    }));
  }, [fields]);

  const normalizeProjection = useCallback(
    (rawProjection) => {
      const keys = fieldOptions.map((f) => f.key);

      const safe = rawProjection && typeof rawProjection === "object" ? rawProjection : {};

      const visible_fields = Array.isArray(safe.visible_fields)
        ? safe.visible_fields.filter((x) => typeof x === "string")
        : keys;

      const field_order = Array.isArray(safe.field_order)
        ? safe.field_order.filter((x) => typeof x === "string")
        : visible_fields;

      // Ensure field_order is subset of visible_fields, preserve order.
      const visibleSet = new Set(visible_fields);
      const field_order_norm = field_order.filter((k) => visibleSet.has(k));

      const title_field =
        typeof safe.title_field === "string" ? safe.title_field : null;

      const default_sort = safe.default_sort && typeof safe.default_sort === "object"
        ? safe.default_sort
        : {};

      const order =
        default_sort.order === "asc" || default_sort.order === "desc"
          ? default_sort.order
          : "desc";

      const default_sort_field =
        typeof default_sort.field === "string" ? default_sort.field : null;

      return {
        visible_fields: visible_fields,
        field_order: field_order_norm.length ? field_order_norm : visible_fields,
        title_field,
        default_sort: {
          field: default_sort_field,
          order,
        },
      };
    },
    [fieldOptions],
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await designerApi.listViews(tenantId, objectTypeId);
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить вкладки"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, objectTypeId]);

  const loadFields = useCallback(async () => {
    try {
      const data = await designerApi.listFields(tenantId, objectTypeId);
      setFields(data || []);
    } catch {
      setFields([]);
    }
  }, [tenantId, objectTypeId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }

    setDraft({
      name: selected.name,
      key: selected.key,
      view_type: selected.view_type,
      is_active: selected.is_active,
      description: selected.description || "",
      settings_json: selected.settings_json || {},
      projection: normalizeProjection(selected.settings_json?.projection),
    });
  }, [selected, normalizeProjection]);

  const handleCreate = async () => {
    const name = window.prompt("Название вкладки", "Новая вкладка");
    if (!name) return;

    const key = window.prompt("Key вкладки", "new_view");
    if (!key) return;

    try {
      await designerApi.createView(tenantId, objectTypeId, {
        name,
        key,
        view_type: "table",
        is_active: true,
      });
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось создать вкладку"));
    }
  };

  const openRuntimePreviewForView = () => {
    if (!selected) return;
    navigate(
      `/designer/tenant/${tenantId}/object-types/${objectTypeId}/runtime-preview?viewKey=${encodeURIComponent(
        selected.key,
      )}`,
    );
  };

  const handleSave = async () => {
    if (!selected || !draft) return;

    setSaving(true);

    try {
      const nextSettings = {
        ...(draft.settings_json || {}),
        projection: {
          ...draft.projection,
        },
      };

      await designerApi.updateView(tenantId, selected.id, {
        name: draft.name,
        view_type: draft.view_type,
        is_active: draft.is_active,
        description: draft.description,
        settings_json: nextSettings,
      });
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось сохранить вкладку"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (selected.is_system && selected.is_default) {
      window.alert("Системную default вкладку нельзя удалить");
      return;
    }
    if (!window.confirm(`Удалить вкладку "${selected.name}"?`)) return;

    try {
      await designerApi.deleteView(tenantId, selected.id);
      setSelectedId(null);
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось удалить вкладку"));
    }
  };

  if (loading) return <div className="designer-loading">Загрузка вкладок...</div>;
  if (error) return <div className="designer-error">{error}</div>;

  const toggleVisibleField = (fieldKey) => {
    setDraft((prev) => {
      if (!prev) return prev;

      const visible = new Set(prev.projection.visible_fields || []);
      const fieldOrder = [...(prev.projection.field_order || [])];

      if (visible.has(fieldKey)) {
        visible.delete(fieldKey);
        const removed = new Set([fieldKey]);
        const nextOrder = fieldOrder.filter((k) => !removed.has(k));
        return {
          ...prev,
          projection: {
            ...prev.projection,
            visible_fields: [...visible],
            field_order: nextOrder,
          },
        };
      }

      visible.add(fieldKey);
      const nextOrder = fieldOrder.includes(fieldKey)
        ? fieldOrder
        : [...fieldOrder, fieldKey];

      return {
        ...prev,
        projection: {
          ...prev.projection,
          visible_fields: [...visible],
          field_order: nextOrder,
        },
      };
    });
  };

  const moveFieldOrder = (fieldKey, direction) => {
    setDraft((prev) => {
      if (!prev) return prev;

      const order = [...(prev.projection.field_order || [])];
      const idx = order.indexOf(fieldKey);
      if (idx < 0) return prev;

      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= order.length) return prev;

      const tmp = order[nextIdx];
      order[nextIdx] = order[idx];
      order[idx] = tmp;

      return {
        ...prev,
        projection: {
          ...prev.projection,
          field_order: order,
        },
      };
    });
  };

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
            Вкладки объекта{" "}
            <span className="designer-badge">{items.length}</span>
          </h3>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            onClick={handleCreate}
          >
            + Создать вкладку
          </button>
        </div>

        <div className="designer-table-wrap">
          <table className="designer-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Key</th>
                <th>Тип</th>
                <th>Активно</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={item.id === selectedId ? "is-selected" : ""}
                  onClick={() => setSelectedId(item.id)}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{item.name}</span>
                      {item.is_system ? (
                        <span className="designer-badge" title="Системная вкладка">
                          System
                        </span>
                      ) : null}
                      {item.is_default ? (
                        <span className="designer-badge" title="Вкладка по умолчанию">
                          Default
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <code>{item.key}</code>
                  </td>
                  <td>{item.view_type}</td>
                  <td>{item.is_active ? "Да" : "Нет"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && draft ? (
        <PropertiesPanel
          title="Свойства вкладки"
          onClose={() => setSelectedId(null)}
          footer={
            <>
              <button
                type="button"
                className="designer-btn designer-btn--danger"
                onClick={handleDelete}
                disabled={isSelectedSystemDefault}
              >
                Удалить
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
          {isSelectedSystemDefault ? (
            <div className="designer-field-hint">
              System/default key заблокирован для изменения.
            </div>
          ) : null}
          <div style={{ height: 10 }} />
          <label className="designer-label">Тип</label>
          <select
            className="designer-select"
            value={draft.view_type}
            onChange={(e) => setDraft({ ...draft, view_type: e.target.value })}
          >
            {VIEW_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
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
            Активное представление
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

          <div style={{ height: 18 }} />

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: 14 }}>Projection settings</h4>
            <button
              type="button"
              className="designer-btn"
              onClick={openRuntimePreviewForView}
            >
              Открыть preview
            </button>
          </div>

          <div style={{ height: 12 }} />

          <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#475569" }}>
            Visible fields
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fieldOptions.map((f) => (
              <label key={f.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={(draft.projection.visible_fields || []).includes(f.key)}
                  onChange={() => toggleVisibleField(f.key)}
                />
                <span style={{ fontSize: 13 }}>{f.name}</span>
              </label>
            ))}
          </div>

          <div style={{ height: 16 }} />

          <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#475569" }}>
            Field order
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(draft.projection.field_order || []).map((fieldKey, idx) => {
              const field = fieldOptions.find((f) => f.key === fieldKey);
              return (
                <div
                  key={`${fieldKey}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid var(--designer-border)",
                    background: "#fff",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {field?.name || fieldKey}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {fieldKey}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="designer-btn"
                      disabled={idx === 0}
                      onClick={() => moveFieldOrder(fieldKey, "up")}
                      title="Вверх"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="designer-btn"
                      disabled={idx === (draft.projection.field_order || []).length - 1}
                      onClick={() => moveFieldOrder(fieldKey, "down")}
                      title="Вниз"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ height: 16 }} />

          <label className="designer-label">Title field</label>
          <select
            className="designer-select"
            value={draft.projection.title_field || ""}
            onChange={(e) => {
              const v = e.target.value;
              setDraft({
                ...draft,
                projection: {
                  ...draft.projection,
                  title_field: v ? v : null,
                },
              });
            }}
          >
            <option value="">null</option>
            {fieldOptions.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name}
              </option>
            ))}
          </select>

          <div style={{ height: 16 }} />

          <label className="designer-label">Default sort</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
            <select
              className="designer-select"
              value={draft.projection.default_sort.field || ""}
              onChange={(e) => {
                const v = e.target.value;
                setDraft({
                  ...draft,
                  projection: {
                    ...draft.projection,
                    default_sort: {
                      ...draft.projection.default_sort,
                      field: v ? v : null,
                    },
                  },
                });
              }}
            >
              <option value="">created_at</option>
              {fieldOptions.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.name}
                </option>
              ))}
            </select>

            <select
              className="designer-select"
              value={draft.projection.default_sort.order || "desc"}
              onChange={(e) => {
                const order = e.target.value;
                setDraft({
                  ...draft,
                  projection: {
                    ...draft.projection,
                    default_sort: {
                      ...draft.projection.default_sort,
                      order,
                    },
                  },
                });
              }}
            >
              <option value="asc">asc</option>
              <option value="desc">desc</option>
            </select>
          </div>

          <div className="designer-field-hint">
            Preview обновится после Publish catalog (projection берётся из published catalog).
          </div>
        </PropertiesPanel>
      ) : null}
    </div>
  );
}
