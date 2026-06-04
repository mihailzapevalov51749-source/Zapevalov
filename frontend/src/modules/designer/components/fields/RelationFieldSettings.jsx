import { useMemo, useState } from "react";

import CreateRelationDefinitionModal from "../relations/CreateRelationDefinitionModal";
import {
  formatRelationDefinitionLabel,
  listActiveRelationDefinitions,
  RELATION_CARDINALITY_OPTIONS,
  RELATION_ROLE_OPTIONS,
  resolveRelationDefinitionsAvailability,
  suggestRelationRoleForObjectType,
} from "./relationFieldFormUtils";

import "./relationFieldSettings.css";

export default function RelationFieldSettings({
  tenantId = null,
  objectTypeId = null,
  objectTypeLabel = "",
  relationDefinitions = [],
  existingRelationKeys = [],
  relation_key = "",
  role = "",
  cardinality = "",
  errors = {},
  onChange,
  onReloadRelations,
  onOpenRelationsTab,
}) {
  const [isCreateRelationModalOpen, setIsCreateRelationModalOpen] = useState(false);
  const [isReloadingRelations, setIsReloadingRelations] = useState(false);

  const availability = useMemo(
    () => resolveRelationDefinitionsAvailability(relationDefinitions),
    [relationDefinitions],
  );

  const activeRelations = availability.active;

  const selectedRelation = useMemo(
    () =>
      activeRelations.find(
        (item) => String(item.key) === String(relation_key || "").trim(),
      ) || null,
    [activeRelations, relation_key],
  );

  const applyRelationSelection = (relationDef, nextKey = relationDef?.key) => {
    const suggestedRole = suggestRelationRoleForObjectType(objectTypeId, relationDef);

    onChange?.({
      relation_key: String(nextKey || "").trim(),
      role: suggestedRole || role,
      cardinality: cardinality || "one",
    });
  };

  const handleRelationKeyChange = (nextKey) => {
    const relationDef =
      activeRelations.find((item) => String(item.key) === String(nextKey)) || null;

    applyRelationSelection(relationDef, nextKey);
  };

  const handleRelationCreated = async (created) => {
    if (!created) {
      return;
    }

    setIsReloadingRelations(true);

    try {
      let nextDefinitions = relationDefinitions;

      if (typeof onReloadRelations === "function") {
        nextDefinitions = await onReloadRelations();
      }

      const refreshedList = listActiveRelationDefinitions(
        Array.isArray(nextDefinitions) ? nextDefinitions : relationDefinitions,
      );

      const relationDef =
        refreshedList.find(
          (item) => String(item.key) === String(created.key || "").trim(),
        ) || created;

      applyRelationSelection(relationDef, relationDef.key);
    } finally {
      setIsReloadingRelations(false);
    }
  };

  return (
    <div className="designer-relation-field-settings">
      <h4 className="designer-relation-field-settings__title">Настройки связи</h4>

      <label className="designer-label">
        Связь
        <select
          className="designer-select"
          value={relation_key}
          onChange={(event) => handleRelationKeyChange(event.target.value)}
          disabled={!activeRelations.length || isReloadingRelations}
        >
          <option value="">Выберите связь</option>
          {activeRelations.map((relation) => (
            <option key={relation.id || relation.key} value={relation.key}>
              {formatRelationDefinitionLabel(relation)}
            </option>
          ))}
        </select>
      </label>
      {errors.relation_key ? (
        <p className="designer-relation-field-settings__error">{errors.relation_key}</p>
      ) : null}

      {availability.isEmpty ? (
        <div className="designer-relation-field-settings__empty">
          <p className="designer-relation-field-settings__hint">
            Для поля «Связи» нужна модель связи между типами объектов. Создайте связь — затем
            выберите её в списке и укажите роль и кардинальность поля.
          </p>
          <button
            type="button"
            className="designer-btn designer-btn--primary designer-relation-field-settings__cta"
            onClick={() => setIsCreateRelationModalOpen(true)}
            disabled={!tenantId || !objectTypeId || isReloadingRelations}
          >
            Создать связь
          </button>
        </div>
      ) : null}

      {availability.hasInactiveOnly ? (
        <div className="designer-relation-field-settings__empty">
          <p className="designer-relation-field-settings__hint">
            Для этого объекта существуют только неактивные связи. Активируйте связь или создайте
            новую на вкладке «Связи».
          </p>
          {typeof onOpenRelationsTab === "function" ? (
            <button
              type="button"
              className="designer-btn designer-relation-field-settings__cta"
              onClick={onOpenRelationsTab}
            >
              Управление связями
            </button>
          ) : null}
        </div>
      ) : null}

      {activeRelations.length > 0 ? (
        <button
          type="button"
          className="designer-relation-field-settings__link-btn"
          onClick={() => setIsCreateRelationModalOpen(true)}
          disabled={!tenantId || !objectTypeId || isReloadingRelations}
        >
          + Создать связь
        </button>
      ) : null}

      <label className="designer-label">
        Роль
        <select
          className="designer-select"
          value={role}
          onChange={(event) =>
            onChange?.({
              relation_key,
              role: event.target.value,
              cardinality,
            })
          }
        >
          <option value="">Выберите роль</option>
          {RELATION_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {errors.role ? (
        <p className="designer-relation-field-settings__error">{errors.role}</p>
      ) : null}

      {selectedRelation ? (
        <p className="designer-relation-field-settings__hint">
          {String(selectedRelation.source_object_type_id) === String(objectTypeId)
            ? "Текущий тип объекта — источник в выбранной связи."
            : null}
          {String(selectedRelation.target_object_type_id) === String(objectTypeId)
            ? "Текущий тип объекта — получатель в выбранной связи."
            : null}
        </p>
      ) : null}

      <label className="designer-label">
        Кардинальность
        <select
          className="designer-select"
          value={cardinality}
          onChange={(event) =>
            onChange?.({
              relation_key,
              role,
              cardinality: event.target.value,
            })
          }
        >
          <option value="">Выберите кардинальность</option>
          {RELATION_CARDINALITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {errors.cardinality ? (
        <p className="designer-relation-field-settings__error">
          {errors.cardinality}
        </p>
      ) : null}

      <CreateRelationDefinitionModal
        open={isCreateRelationModalOpen}
        tenantId={tenantId}
        sourceObjectTypeId={objectTypeId}
        sourceObjectTypeLabel={objectTypeLabel}
        existingRelationKeys={existingRelationKeys}
        onClose={() => setIsCreateRelationModalOpen(false)}
        onCreated={handleRelationCreated}
      />
    </div>
  );
}
