import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import CreateRelationDefinitionModal from "../relations/CreateRelationDefinitionModal";
import RelationPropertiesForm from "../relations/RelationPropertiesForm";
import "../relations/relationPropertiesPanel.css";
import {
  ObjectSettingsButton,
  ObjectSettingsEmptyState,
  ObjectSettingsHeader,
  ObjectSettingsPage,
  ObjectSettingsPanel,
  ObjectSettingsPanelFooter,
  ObjectSettingsSplitLayout,
  buildObjectSettingsLayoutStorageKey,
} from "../../../../shared/objectSettings";
import { isHierarchyRelationDefinition } from "../../../../shared/relation/hierarchyRelationProfile.js";
import { DEFAULT_HIERARCHY_LABELS } from "../../../../shared/relation/hierarchyLabels.js";

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

  const objectTypeKey = objectType?.key || "";

  const objectTypeLabel = useMemo(
    () => String(objectType?.name || objectType?.key || "").trim(),
    [objectType],
  );

  const layoutStorageKey = useMemo(
    () =>
      buildObjectSettingsLayoutStorageKey({
        tenantId,
        objectTypeKey,
        tabKey: "relations",
      }),
    [objectTypeKey, tenantId],
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
    <ObjectSettingsPage>
      <ObjectSettingsHeader
        title="Список связей"
        count={items.length}
        centered
        primaryAction={
          <ObjectSettingsButton
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Добавить связь
          </ObjectSettingsButton>
        }
      />

      <ObjectSettingsSplitLayout
        storageKey={layoutStorageKey}
        left={
          <ObjectSettingsPanel
            title="Список связей"
            tone="muted"
            titleId="designer-object-relations-list-title"
          >
            {!items.length ? (
              <ObjectSettingsEmptyState
                compact
                inPanel
                title="Нет связей"
                description="Добавьте первую связь с помощью кнопки «+ Добавить связь»."
              />
            ) : (
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
            )}
          </ObjectSettingsPanel>
        }
        right={
          <ObjectSettingsPanel
            title="Свойства связи"
            titleId="designer-object-relation-properties-title"
            footer={
              selected && draft ? (
                <ObjectSettingsPanelFooter
                  onDelete={handleDelete}
                  onSave={handleSave}
                  saving={saving}
                />
              ) : null
            }
          >
            {selected && draft ? (
              <RelationPropertiesForm
                draft={draft}
                objectTypeLabel={objectTypeLabel}
                onDraftChange={setDraft}
              />
            ) : (
              <ObjectSettingsEmptyState
                compact
                inPanel
                title={
                  items.length === 0
                    ? "Создайте первый элемент"
                    : "Выберите элемент слева"
                }
                description={
                  items.length === 0
                    ? "Добавьте первую связь с помощью кнопки «+ Добавить связь»."
                    : "Чтобы просмотреть и изменить свойства связи."
                }
              />
            )}
          </ObjectSettingsPanel>
        }
      />

      <CreateRelationDefinitionModal
        open={isCreateModalOpen}
        tenantId={tenantId}
        sourceObjectTypeId={objectTypeId}
        sourceObjectTypeLabel={objectTypeLabel}
        existingRelationKeys={existingRelationKeys}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleRelationCreated}
      />
    </ObjectSettingsPage>
  );
}
