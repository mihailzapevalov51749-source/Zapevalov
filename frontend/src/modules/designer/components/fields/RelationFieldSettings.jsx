import { useEffect, useMemo, useState } from "react";

import CreateRelationDefinitionModal from "../relations/CreateRelationDefinitionModal";
import {
  buildRelationFieldSelectionPatch,
  filterRelationDefinitionsForObjectType,
  formatRelationDefinitionLabel,
  getRelationCardinalityLabel,
  getRelationRoleLabel,
  isRelationDefinitionForObjectType,
  resolveRelationFieldBinding,
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

  const applicableRelations = useMemo(
    () => filterRelationDefinitionsForObjectType(relationDefinitions, objectTypeId),
    [relationDefinitions, objectTypeId],
  );

  const inactiveForObject = useMemo(
    () =>
      (Array.isArray(relationDefinitions) ? relationDefinitions : []).filter(
        (item) =>
          item &&
          item.is_active === false &&
          isRelationDefinitionForObjectType(objectTypeId, item),
      ),
    [relationDefinitions, objectTypeId],
  );

  const selectedRelation = useMemo(
    () =>
      applicableRelations.find(
        (item) => String(item.key) === String(relation_key || "").trim(),
      ) || null,
    [applicableRelations, relation_key],
  );

  const resolvedBinding = useMemo(
    () => resolveRelationFieldBinding(objectTypeId, selectedRelation),
    [objectTypeId, selectedRelation],
  );

  const applyRelationSelection = (relationDef, nextKey = relationDef?.key) => {
    onChange?.(buildRelationFieldSelectionPatch(objectTypeId, relationDef, nextKey));
  };

  const handleRelationKeyChange = (nextKey) => {
    const relationDef =
      applicableRelations.find((item) => String(item.key) === String(nextKey)) || null;

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

      const refreshedList = filterRelationDefinitionsForObjectType(
        Array.isArray(nextDefinitions) ? nextDefinitions : relationDefinitions,
        objectTypeId,
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

  useEffect(() => {
    if (!relation_key || !selectedRelation || !resolvedBinding) {
      return;
    }

    if (role === resolvedBinding.role && cardinality === resolvedBinding.cardinality) {
      return;
    }

    onChange?.({
      relation_key,
      role: resolvedBinding.role,
      cardinality: resolvedBinding.cardinality,
    });
  }, [
    cardinality,
    onChange,
    relation_key,
    resolvedBinding,
    role,
    selectedRelation,
  ]);

  const isEmpty = applicableRelations.length === 0 && inactiveForObject.length === 0;
  const hasInactiveOnly =
    applicableRelations.length === 0 && inactiveForObject.length > 0;

  return (
    <div className="designer-relation-field-settings">
      <h4 className="designer-relation-field-settings__title">Настройки связи</h4>

      <label className="designer-label">
        Связь
        <select
          className="designer-select"
          value={relation_key}
          onChange={(event) => handleRelationKeyChange(event.target.value)}
          disabled={!applicableRelations.length || isReloadingRelations}
        >
          <option value="">Выберите связь</option>
          {applicableRelations.map((relation) => (
            <option key={relation.id || relation.key} value={relation.key}>
              {formatRelationDefinitionLabel(relation)}
            </option>
          ))}
        </select>
      </label>
      {errors.relation_key ? (
        <p className="designer-relation-field-settings__error">{errors.relation_key}</p>
      ) : null}

      {isEmpty ? (
        <div className="designer-relation-field-settings__empty">
          <p className="designer-relation-field-settings__hint">
            Для поля «Связи» нужна модель связи между типами объектов. Создайте связь — затем
            выберите её в списке.
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

      {hasInactiveOnly ? (
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

      {applicableRelations.length > 0 ? (
        <button
          type="button"
          className="designer-relation-field-settings__link-btn"
          onClick={() => setIsCreateRelationModalOpen(true)}
          disabled={!tenantId || !objectTypeId || isReloadingRelations}
        >
          + Создать связь
        </button>
      ) : null}

      {selectedRelation && resolvedBinding ? (
        <>
          <div className="designer-relation-field-settings__readonly">
            <span className="designer-relation-field-settings__readonly-label">
              Роль текущего объекта
            </span>
            <span className="designer-relation-field-settings__readonly-value">
              {getRelationRoleLabel(resolvedBinding.role)}
            </span>
          </div>
          {errors.role ? (
            <p className="designer-relation-field-settings__error">{errors.role}</p>
          ) : null}

          <div className="designer-relation-field-settings__readonly">
            <span className="designer-relation-field-settings__readonly-label">
              Кардинальность поля
            </span>
            <span className="designer-relation-field-settings__readonly-value">
              {getRelationCardinalityLabel(resolvedBinding.cardinality)}
            </span>
          </div>
          {errors.cardinality ? (
            <p className="designer-relation-field-settings__error">{errors.cardinality}</p>
          ) : null}
        </>
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
