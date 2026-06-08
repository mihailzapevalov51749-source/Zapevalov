import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import CreateFieldModal, { FIELD_TYPE_OPTIONS } from "../fields/CreateFieldModal";
import FieldPropertiesForm from "../fields/FieldPropertiesForm";
import {
  buildChoiceSettingsPayload,
  buildFileSettingsPayload,
  getFieldTypeLabel,
  isChoiceFieldType,
  isChoiceMultipleFromField,
  isFileFieldType,
  isFileMultipleFromField,
  normalizeChoiceOptionsFromSettings,
  resolveChoiceFieldTypeForSave,
} from "../fields/fieldFormUtils";
import {
  buildDefaultValuePayload,
  normalizeDefaultValueFromField,
  validateDefaultValueDraft,
} from "../fields/defaultValue/defaultValueFormUtils";
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
import {
  buildRelationSettingsPayload,
  isRelationFieldType,
  normalizeRelationSettingsFromField,
  validateRelationFieldDraft,
  formatRelationFieldApiError,
  resolveRelationFieldSettingsPayload,
} from "../fields/relationFieldFormUtils";

export default function FieldsTab({
  tenantId,
  objectTypeId,
  objectType = null,
  onSchemaChanged,
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [relationDefinitions, setRelationDefinitions] = useState([]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const existingFieldKeys = items
    .map((item) => String(item.key || "").trim().toLowerCase())
    .filter(Boolean);

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

  const reloadRelations = useCallback(async () => {
    try {
      const data = await designerApi.listRelations(tenantId, objectTypeId);
      const nextList = Array.isArray(data) ? data : [];
      setRelationDefinitions(nextList);
      return nextList;
    } catch {
      setRelationDefinitions([]);
      return [];
    }
  }, [tenantId, objectTypeId]);

  useEffect(() => {
    void reloadRelations();
  }, [reloadRelations]);

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
        tabKey: "fields",
      }),
    [objectTypeKey, tenantId],
  );

  const existingRelationKeys = useMemo(
    () =>
      relationDefinitions
        .map((item) => String(item?.key || "").trim())
        .filter(Boolean),
    [relationDefinitions],
  );

  const handleOpenRelationsTab = useCallback(() => {
    navigate(`/designer/tenant/${tenantId}/object-types/${objectTypeId}/relations`);
  }, [navigate, tenantId, objectTypeId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setSaveError("");
      return;
    }

    const { options: choice_options, multiple: settingsMultiple } =
      normalizeChoiceOptionsFromSettings(selected.settings_json);
    const relationSettings = normalizeRelationSettingsFromField(
      selected.settings_json,
    );

    setDraft({
      name: selected.name,
      key: selected.key,
      field_type: selected.field_type,
      is_required: selected.is_required,
      is_unique: selected.is_unique,
      quick_create: Boolean(selected.quick_create),
      description: selected.description || "",
      placeholder: selected.placeholder || "",
      choice_options,
      choice_multiple: isChoiceMultipleFromField(
        selected.field_type,
        selected.settings_json,
      ) || settingsMultiple,
      file_multiple: isFileMultipleFromField(
        selected.field_type,
        selected.settings_json,
      ),
      relation_key: relationSettings.relation_key,
      relation_role: relationSettings.role,
      relation_cardinality: relationSettings.cardinality || "one",
      choice_options_error: "",
      relation_key_error: "",
      relation_role_error: "",
      relation_cardinality_error: "",
      default_value: normalizeDefaultValueFromField(
        selected.default_value_json,
        selected.field_type,
      ),
      default_value_error: "",
    });
    setSaveError("");
  }, [selected]);

  const handleCreateField = async (payload) => {
    setIsCreating(true);
    setCreateError("");

    try {
      await designerApi.createField(tenantId, objectTypeId, payload);
      setIsCreateModalOpen(false);
      setSelectedId(null);
      setDraft(null);
      await loadItems();
      await onSchemaChanged?.();
    } catch (err) {
      setCreateError(
        formatRelationFieldApiError(
          getApiErrorMessage(err, "Не удалось создать поле"),
        ),
      );
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selected || !draft) return;

    const name = String(draft.name || "").trim();
    if (!name) {
      setSaveError("Укажите название поля");
      return;
    }

    const payload = {
      name,
      field_type: draft.field_type,
      is_required: Boolean(draft.is_required),
      is_unique: Boolean(draft.is_unique),
      quick_create: Boolean(draft.quick_create),
      description: String(draft.description || "").trim(),
      placeholder: String(draft.placeholder || "").trim(),
    };

    if (isChoiceFieldType(draft.field_type)) {
      const choiceOptions = Array.isArray(draft.choice_options)
        ? draft.choice_options
        : [];

      if (choiceOptions.length === 0) {
        setDraft((current) =>
          current
            ? { ...current, choice_options_error: "Добавьте хотя бы один вариант" }
            : current,
        );
        setSaveError("Добавьте хотя бы один вариант значения");
        return;
      }

      payload.field_type = resolveChoiceFieldTypeForSave(
        draft.field_type,
        draft.choice_multiple,
      );
      payload.settings_json = buildChoiceSettingsPayload(
        choiceOptions,
        draft.choice_multiple,
      );
    }

    if (isFileFieldType(draft.field_type)) {
      payload.settings_json = buildFileSettingsPayload(draft.file_multiple);
    }

    if (isRelationFieldType(draft.field_type)) {
      const relationErrors = validateRelationFieldDraft(
        {
          relation_key: draft.relation_key,
          role: draft.relation_role,
          cardinality: draft.relation_cardinality,
        },
        { objectTypeId, relationDefinitions },
      );

      if (Object.keys(relationErrors).length > 0) {
        setDraft((current) =>
          current
            ? {
                ...current,
                relation_key_error: relationErrors.relation_key || "",
                relation_role_error: relationErrors.role || "",
                relation_cardinality_error: relationErrors.cardinality || "",
              }
            : current,
        );
        setSaveError(
          relationErrors.relation_key ||
            relationErrors.role ||
            relationErrors.cardinality ||
            "Заполните настройки поля «Связи»",
        );
        return;
      }

      const relationSettings = resolveRelationFieldSettingsPayload({
        objectTypeId,
        relationDefinitions,
        relation_key: draft.relation_key,
      });

      payload.settings_json =
        relationSettings ||
        buildRelationSettingsPayload({
          relation_key: draft.relation_key,
          role: draft.relation_role,
          cardinality: draft.relation_cardinality,
        });
    }

    const defaultValueError = validateDefaultValueDraft(draft.default_value, draft.field_type, {
      choiceOptions: draft.choice_options,
    });

    if (defaultValueError) {
      setDraft((current) =>
        current ? { ...current, default_value_error: defaultValueError } : current,
      );
      setSaveError(defaultValueError);
      return;
    }

    const builtDefaultValue = buildDefaultValuePayload(
      draft.default_value,
      draft.field_type,
    );

    if (builtDefaultValue.error) {
      setSaveError(builtDefaultValue.error);
      return;
    }

    if (builtDefaultValue.payload) {
      payload.default_value_json = builtDefaultValue.payload;
    }

    setSaving(true);
    setSaveError("");

    try {
      await designerApi.updateField(tenantId, objectTypeId, selected.id, payload);
      await loadItems();
      await onSchemaChanged?.();
    } catch (err) {
      setSaveError(
        formatRelationFieldApiError(
          getApiErrorMessage(err, "Не удалось сохранить поле"),
        ),
      );
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
      setDraft(null);
      await loadItems();
      await onSchemaChanged?.();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось удалить поле"));
    }
  };

  if (loading) return <div className="designer-loading">Загрузка полей...</div>;
  if (error) return <div className="designer-error">{error}</div>;

  return (
    <ObjectSettingsPage>
      <ObjectSettingsHeader
        title="Поля объекта"
        count={items.length}
        centered
        primaryAction={
          <ObjectSettingsButton
            variant="primary"
            onClick={() => {
              setCreateError("");
              setIsCreateModalOpen(true);
            }}
          >
            + Добавить поле
          </ObjectSettingsButton>
        }
      />

      <ObjectSettingsSplitLayout
        storageKey={layoutStorageKey}
        left={
          <ObjectSettingsPanel
            title="Список полей"
            tone="muted"
            titleId="designer-object-fields-list-title"
          >
            {!items.length ? (
              <ObjectSettingsEmptyState
                compact
                inPanel
                title="Нет полей"
                description="Добавьте первое поле с помощью кнопки «+ Добавить поле»."
              />
            ) : (
              <div className="designer-table-wrap">
                <table className="designer-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Key</th>
                      <th>Тип</th>
                      <th>Обязательное</th>
                      <th>Уникальное</th>
                      <th>Быстрая форма</th>
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
                        <td>{getFieldTypeLabel(item.field_type, FIELD_TYPE_OPTIONS)}</td>
                        <td>{item.is_required ? "Да" : "Нет"}</td>
                        <td>{item.is_unique ? "Да" : "Нет"}</td>
                        <td>{item.quick_create ? "Да" : "Нет"}</td>
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
            title="Свойства поля"
            titleId="designer-object-field-properties-title"
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
              <FieldPropertiesForm
                draft={draft}
                tenantId={tenantId}
                objectTypeId={objectTypeId}
                objectTypeLabel={objectTypeLabel}
                relationDefinitions={relationDefinitions}
                existingRelationKeys={existingRelationKeys}
                onReloadRelations={reloadRelations}
                onOpenRelationsTab={handleOpenRelationsTab}
                saveError={saveError}
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
                    ? "Добавьте первое поле с помощью кнопки «+ Добавить поле»."
                    : "Чтобы просмотреть и изменить свойства поля."
                }
              />
            )}
          </ObjectSettingsPanel>
        }
      />

      <CreateFieldModal
        isOpen={isCreateModalOpen}
        existingFieldKeys={existingFieldKeys}
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectTypeLabel={objectTypeLabel}
        relationDefinitions={relationDefinitions}
        existingRelationKeys={existingRelationKeys}
        onReloadRelations={reloadRelations}
        onOpenRelationsTab={handleOpenRelationsTab}
        isSubmitting={isCreating}
        submitError={createError}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateField}
      />
    </ObjectSettingsPage>
  );
}
