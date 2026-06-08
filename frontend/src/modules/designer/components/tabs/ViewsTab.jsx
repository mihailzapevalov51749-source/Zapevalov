import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import { resolveStudioDraftProjection } from "../../utils/resolveStudioDraftProjection";
import { computeStudioViewDraftDirty } from "../../utils/computeStudioViewDraftDirty";
import { saveStudioViewDraft } from "../../utils/saveStudioViewDraft";
import { readRoleMappingFromSettings } from "../../utils/syncViewSettingsRoleMapping";
import { readPlanSettingsFromView } from "../../utils/syncPlanViewSettings";
import {
  hideStudioDraftProjectionField,
  reorderStudioDraftProjectionInfoFieldKeys,
  toggleStudioDraftProjectionInfoField,
} from "../../../objectViews/plan/planPreviewConstructor.js";
import {
  readObjectTabSettings,
} from "../../../objectViews/services/objectTabSettings";
import ViewPropertiesForm from "../views/ViewPropertiesForm";
import CreateObjectViewModal from "../views/CreateObjectViewModal.jsx";
import { useObjectTypePreviewTab } from "../../context/ObjectTypePreviewTabContext";
import { usePlanViewStudio } from "../../context/PlanViewStudioContext";
import {
  ObjectSettingsBadge,
  ObjectSettingsButton,
  ObjectSettingsEmptyState,
  ObjectSettingsHeader,
  ObjectSettingsPage,
  ObjectSettingsPanel,
  ObjectSettingsPanelFooter,
  ObjectSettingsSplitLayout,
  buildObjectSettingsLayoutStorageKey,
} from "../../../../shared/objectSettings";

export default function ViewsTab({
  tenantId,
  objectTypeId,
  objectTypeName = "",
  objectTypeKey = "",
  onSchemaChanged = null,
  registerSave = null,
  onDirtyChange = null,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);
  const [relations, setRelations] = useState([]);
  const [planSettings, setPlanSettings] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const navigate = useNavigate();
  const previewTab = useObjectTypePreviewTab();
  const planStudio = usePlanViewStudio();

  const fieldOptions = useMemo(() => {
    return (fields || []).map((f) => ({
      id: f.id,
      key: f.key,
      name: f.name || f.key,
      field_type: f.field_type || f.type,
      is_system: Boolean(f.is_system),
    }));
  }, [fields]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const isPlanStudioBound =
    selected?.view_type === "plan" &&
    planStudio?.activeViewKey === selected?.key &&
    Boolean(planStudio?.draft);
  const panelDraft = isPlanStudioBound ? planStudio.draft : draft;
  const panelPlanSettings = isPlanStudioBound ? planStudio.planSettings : planSettings;
  const panelSetDraft = isPlanStudioBound ? planStudio.setDraft : setDraft;
  const panelSetPlanSettings = isPlanStudioBound ? planStudio.setPlanSettings : setPlanSettings;
  const panelFieldOptions = isPlanStudioBound
    ? planStudio?.fieldOptions || fieldOptions
    : fieldOptions;
  const isSelectedSystemDefault = Boolean(selected?.is_system && selected?.is_default);

  const layoutStorageKey = useMemo(
    () =>
      buildObjectSettingsLayoutStorageKey({
        tenantId,
        objectTypeKey,
        tabKey: "tabs",
      }),
    [objectTypeKey, tenantId],
  );

  const loadRelations = useCallback(async () => {
    try {
      const data = await designerApi.listRelations(tenantId, objectTypeId);
      setRelations(Array.isArray(data) ? data : []);
    } catch {
      setRelations([]);
    }
  }, [tenantId, objectTypeId]);

  const relationOptions = useMemo(() => {
    return (relations || []).map((relation) => ({
      key: relation.key,
      name: relation.name || relation.key,
      relation_type: relation.relation_type,
      source_object_type_key: relation.source_object_type_key,
      target_object_type_key: relation.target_object_type_key,
      settings_json: relation.settings_json || {},
    }));
  }, [relations]);

  const normalizeProjection = useCallback(
    (settingsJson) => resolveStudioDraftProjection(settingsJson, fieldOptions),
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
    loadRelations();
  }, [loadFields, loadRelations]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setPlanSettings(null);
      return;
    }

    if (selected.view_type === "plan") {
      planStudio?.bindViewKey?.(selected.key);
      return;
    }

    const settingsJson = selected.settings_json || {};

    setDraft({
      name: selected.name,
      key: selected.key,
      view_type: selected.view_type,
      is_active: selected.is_active,
      description: selected.description || "",
      settings_json: settingsJson,
      projection: normalizeProjection(settingsJson),
      roleMapping: readRoleMappingFromSettings(settingsJson),
      tabSettings: readObjectTabSettings(settingsJson),
    });
    setPlanSettings(readPlanSettingsFromView(settingsJson));
  }, [selected, normalizeProjection, planStudio]);

  const isViewsDirty = useMemo(() => {
    if (!selected || selected.view_type === "plan") {
      return false;
    }

    if (!draft) {
      return false;
    }

    return computeStudioViewDraftDirty({
      view: selected,
      draft,
      planSettings,
      fieldOptions,
    });
  }, [selected, draft, planSettings, fieldOptions]);

  useEffect(() => {
    if (selected?.view_type === "plan") {
      onDirtyChange?.(false);
      return;
    }

    onDirtyChange?.(isViewsDirty);
  }, [isViewsDirty, onDirtyChange, selected?.view_type]);

  const existingViewKeys = useMemo(
    () => items.map((item) => String(item?.key || "").trim()).filter(Boolean),
    [items],
  );

  const handleViewCreated = async (created) => {
    await loadItems();

    const createdKey = String(created?.key || "").trim();
    await onSchemaChanged?.({ viewKey: createdKey || null });
    await previewTab?.reloadViews?.();
    if (createdKey) {
      previewTab?.selectView?.(createdKey);
    }

    if (created?.id != null) {
      setSelectedId(created.id);
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

  const handleSave = useCallback(async () => {
    const saveDraft = isPlanStudioBound ? planStudio?.draft : draft;
    const savePlanSettings = isPlanStudioBound ? planStudio?.planSettings : planSettings;

    if (!selected || !saveDraft) return;

    setSaving(true);

    try {
      await saveStudioViewDraft({
        tenantId,
        view: selected,
        draft: saveDraft,
        planSettings: savePlanSettings,
      });

      await loadItems();
      await planStudio?.reloadViews?.();
      await onSchemaChanged?.();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось сохранить вкладку"));
    } finally {
      setSaving(false);
    }
  }, [
    selected,
    draft,
    planSettings,
    isPlanStudioBound,
    planStudio,
    tenantId,
    loadItems,
    onSchemaChanged,
  ]);

  useEffect(() => {
    if (selected?.view_type === "plan") {
      registerSave?.(null);
      return () => registerSave?.(null);
    }

    registerSave?.(handleSave);
    return () => registerSave?.(null);
  }, [handleSave, registerSave, selected?.view_type]);

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
    panelSetDraft((prev) => {
      if (!prev) return prev;

      const visible = new Set(prev.projection.visible_fields || []);

      if (visible.has(fieldKey)) {
        return {
          ...prev,
          projection: hideStudioDraftProjectionField(prev.projection, fieldKey),
        };
      }

      visible.add(fieldKey);
      const fieldOrder = [...(prev.projection.field_order || [])];
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

  const toggleInfoField = (fieldKey) => {
    panelSetDraft((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        projection: toggleStudioDraftProjectionInfoField(prev.projection, fieldKey),
      };
    });
  };

  const reorderFieldOrder = (sourceKey, targetKey, position = "before") => {
    panelSetDraft((prev) => {
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
    <ObjectSettingsPage>
      <ObjectSettingsHeader
        title="Вкладки объекта"
        count={items.length}
        centered
        primaryAction={
          <ObjectSettingsButton
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Создать вкладку
          </ObjectSettingsButton>
        }
      />

      <ObjectSettingsSplitLayout
        storageKey={layoutStorageKey}
        left={
          <ObjectSettingsPanel
            title="Список вкладок"
            tone="muted"
            titleId="designer-object-tabs-list-title"
          >
            {!items.length ? (
              <ObjectSettingsEmptyState
                compact
                inPanel
                title="Нет вкладок"
                description="Создайте первую вкладку с помощью кнопки «+ Создать вкладку»."
              />
            ) : (
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
                              <ObjectSettingsBadge variant="system" title="Системная вкладка">
                                System
                              </ObjectSettingsBadge>
                            ) : null}
                            {item.is_default ? (
                              <ObjectSettingsBadge variant="default" title="Вкладка по умолчанию">
                                Default
                              </ObjectSettingsBadge>
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
            )}
          </ObjectSettingsPanel>
        }
        right={
          <ObjectSettingsPanel
            title="Свойства вкладки"
            titleId="designer-object-tab-properties-title"
            footer={
              selected && panelDraft ? (
                <ObjectSettingsPanelFooter
                  onDelete={handleDelete}
                  onSave={handleSave}
                  deleteDisabled={isSelectedSystemDefault}
                  saving={saving}
                />
              ) : null
            }
          >
            {selected && panelDraft ? (
              <ViewPropertiesForm
                draft={panelDraft}
                isSelectedSystemDefault={isSelectedSystemDefault}
                fieldOptions={panelFieldOptions}
                relationOptions={relationOptions}
                objectTypeKey={objectTypeKey}
                planSettings={panelPlanSettings}
                onPlanSettingsChange={panelSetPlanSettings}
                onDraftChange={panelSetDraft}
                onOpenRuntimePreview={openRuntimePreviewForView}
                titleFieldKey={panelDraft.projection?.title_field}
                onToggleVisibleField={toggleVisibleField}
                onToggleInfoField={toggleInfoField}
                onReorderField={reorderFieldOrder}
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
                    ? "Создайте первую вкладку с помощью кнопки «+ Создать вкладку»."
                    : "Чтобы просмотреть и изменить свойства вкладки."
                }
              />
            )}
          </ObjectSettingsPanel>
        }
      />

      <CreateObjectViewModal
        open={isCreateModalOpen}
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectTypeName={objectTypeName}
        existingViewKeys={existingViewKeys}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleViewCreated}
      />
    </ObjectSettingsPage>
  );
}
