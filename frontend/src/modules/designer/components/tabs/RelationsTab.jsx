import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import CreateRelationDefinitionModal from "../relations/CreateRelationDefinitionModal";
import RelationHierarchyLabelsEditor from "../relations/RelationHierarchyLabelsEditor";
import PropertiesPanel from "../common/PropertiesPanel";
import "../relations/relationPropertiesPanel.css";
import { isHierarchyRelationDefinition } from "../../../../shared/relation/hierarchyRelationProfile.js";
import {
  DEFAULT_HIERARCHY_LABELS,
  suggestRussianHierarchyInflection,
} from "../../../../shared/relation/hierarchyLabels.js";

export default function RelationsTab({
  tenantId,
  objectTypeId,
  objectType,
  onSchemaChanged = null,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const selected = items.find((item) => item.id === selectedId) || null;

  const existingRelationKeys = useMemo(
    () => items.map((item) => String(item?.key || "").trim()).filter(Boolean),
    [items],
  );

  const objectTypeLabel = useMemo(
    () => String(objectType?.name || objectType?.key || "").trim(),
    [objectType],
  );

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

    const settings =
      selected.settings_json && typeof selected.settings_json === "object"
        ? selected.settings_json
        : {};
    const storedLabels =
      settings.hierarchy_labels && typeof settings.hierarchy_labels === "object"
        ? settings.hierarchy_labels
        : {};
    const isHierarchy =
      settings.is_hierarchy === true ||
      isHierarchyRelationDefinition(selected, objectType?.key);

    setDraft({
      name: selected.name,
      key: selected.key,
      relation_type: selected.relation_type,
      is_active: selected.is_active,
      description: selected.description || "",
      is_hierarchy: isHierarchy,
      hierarchy_labels: {
        ...DEFAULT_HIERARCHY_LABELS,
        ...storedLabels,
      },
    });
  }, [selected, objectType?.key]);

  const handleRelationCreated = async (created) => {
    await loadItems();
    await onSchemaChanged?.();

    if (created?.id) {
      setSelectedId(created.id);
    }
  };

  const handleSave = async () => {
    if (!selected || !draft) return;

    setSaving(true);

    try {
      const previousSettings =
        selected.settings_json && typeof selected.settings_json === "object"
          ? selected.settings_json
          : {};

      await designerApi.updateRelation(tenantId, selected.id, {
        name: draft.name,
        relation_type: draft.relation_type,
        is_active: draft.is_active,
        description: draft.description,
        settings_json: {
          ...previousSettings,
          is_hierarchy: Boolean(draft.is_hierarchy),
          ...(draft.is_hierarchy ? { hierarchy_labels: draft.hierarchy_labels } : {}),
        },
      });
      await loadItems();
      await onSchemaChanged?.();
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
      await onSchemaChanged?.();
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
            onClick={() => setIsCreateModalOpen(true)}
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
          className="designer-relation-properties-panel"
          title="Свойства связи"
          closeVariant="icon"
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
          <div className="designer-relation-form">
            <div className="designer-relation-form__identity">
              <input
                className="designer-relation-form__name"
                value={draft.name}
                aria-label="Название связи"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
              <code className="designer-relation-form__key">{draft.key}</code>
            </div>

            <div className="designer-relation-form__flags">
              <label className="designer-relation-form__flag">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) =>
                    setDraft({ ...draft, is_active: e.target.checked })
                  }
                />
                Активная связь
              </label>
              <label className="designer-relation-form__flag">
                <input
                  type="checkbox"
                  checked={draft.is_hierarchy}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setDraft((current) => {
                      if (!current) {
                        return current;
                      }

                      const next = {
                        ...current,
                        is_hierarchy: checked,
                      };

                      if (
                        checked &&
                        !current.hierarchy_labels?.child &&
                        current.name
                      ) {
                        next.hierarchy_labels = suggestRussianHierarchyInflection(
                          current.name,
                          objectTypeLabel,
                        );
                      }

                      return next;
                    });
                  }}
                />
                Иерархическая связь
              </label>
            </div>

            <div className="designer-relation-form__group">
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
                <option value="many_to_many">many_to_many</option>
              </select>
            </div>

            <RelationHierarchyLabelsEditor
              isHierarchy={draft.is_hierarchy}
              hierarchyLabels={draft.hierarchy_labels}
              onHierarchyLabelsChange={(hierarchyLabels) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        hierarchy_labels: hierarchyLabels,
                      }
                    : current,
                )
              }
            />

            <div className="designer-relation-form__group">
              <label className="designer-label">Описание</label>
              <textarea
                className="designer-textarea"
                rows={2}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>
          </div>
        </PropertiesPanel>
      ) : null}

      <CreateRelationDefinitionModal
        open={isCreateModalOpen}
        tenantId={tenantId}
        sourceObjectTypeId={objectTypeId}
        sourceObjectTypeLabel={objectTypeLabel}
        existingRelationKeys={existingRelationKeys}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleRelationCreated}
      />
    </div>
  );
}
