import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import ViewPropertiesPanel from "../views/ViewPropertiesPanel";

export default function ViewsTab({
  tenantId,
  objectTypeId,
  onSchemaChanged = null,
}) {
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
      is_system: Boolean(f.is_system),
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
      await onSchemaChanged?.();
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
      await onSchemaChanged?.();
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
      await onSchemaChanged?.();
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

  const reorderFieldOrder = (sourceKey, targetKey, position = "before") => {
    setDraft((prev) => {
      if (!prev) return prev;

      const currentOrder = [...(prev.projection.field_order || [])];
      const allKeys = fieldOptions.map((field) => field.key);
      const unified = [...currentOrder];

      for (const key of allKeys) {
        if (!unified.includes(key)) {
          unified.push(key);
        }
      }

      const fromIndex = unified.indexOf(sourceKey);
      const targetIndex = unified.indexOf(targetKey);

      if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) {
        return prev;
      }

      unified.splice(fromIndex, 1);

      let insertIndex = unified.indexOf(targetKey);

      if (insertIndex < 0) {
        return prev;
      }

      if (position === "after") {
        insertIndex += 1;
      }

      unified.splice(insertIndex, 0, sourceKey);

      return {
        ...prev,
        projection: {
          ...prev.projection,
          field_order: unified,
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
        <ViewPropertiesPanel
          draft={draft}
          isSelectedSystemDefault={isSelectedSystemDefault}
          fieldOptions={fieldOptions}
          saving={saving}
          onDraftChange={setDraft}
          onClose={() => setSelectedId(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onOpenRuntimePreview={openRuntimePreviewForView}
          titleFieldKey={draft.projection?.title_field}
          onToggleVisibleField={toggleVisibleField}
          onReorderField={reorderFieldOrder}
        />
      ) : null}
    </div>
  );
}
