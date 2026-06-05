import { useEffect, useMemo, useState } from "react";

import { listObjectTypes } from "../../../api/designerApi";
import { listRuntimeEntities } from "../../../../runtimeWriteGateway/api/runtimeEntitiesApi";
import { suggestRelationRoleForObjectType } from "../relationFieldFormUtils";

function resolveRelatedObjectTypeKey({
  objectTypeId,
  relationDefinitions,
  relationKey,
  role,
  objectTypes,
}) {
  const relationDef = (relationDefinitions || []).find(
    (item) => String(item?.key || "") === String(relationKey || "").trim(),
  );

  if (!relationDef) {
    return "";
  }

  const effectiveRole =
    String(role || "").trim() ||
    suggestRelationRoleForObjectType(objectTypeId, relationDef);

  const relatedTypeId =
    effectiveRole === "target"
      ? relationDef.source_object_type_id
      : relationDef.target_object_type_id;

  const match = (objectTypes || []).find(
    (item) => String(item?.id || "") === String(relatedTypeId || ""),
  );

  return String(match?.key || "").trim();
}

function buildEntityLabel(entity) {
  const values = entity?.values && typeof entity.values === "object" ? entity.values : {};
  const title = String(values.title || values.name || "").trim();

  if (title) {
    return title;
  }

  return String(entity?.id || "").slice(0, 8);
}

export default function RelationDefaultRecordPicker({
  tenantId,
  objectTypeId,
  relationDefinitions = [],
  relationKey = "",
  relationRole = "",
  value = "",
  onChange,
}) {
  const [objectTypes, setObjectTypes] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const relatedObjectTypeKey = useMemo(
    () =>
      resolveRelatedObjectTypeKey({
        objectTypeId,
        relationDefinitions,
        relationKey,
        role: relationRole,
        objectTypes,
      }),
    [objectTypeId, relationDefinitions, relationKey, relationRole, objectTypes],
  );

  useEffect(() => {
    let mounted = true;

    const loadTypes = async () => {
      if (!tenantId) {
        return;
      }

      try {
        const data = await listObjectTypes(tenantId);

        if (mounted) {
          setObjectTypes(Array.isArray(data) ? data : []);
        }
      } catch {
        if (mounted) {
          setObjectTypes([]);
        }
      }
    };

    void loadTypes();

    return () => {
      mounted = false;
    };
  }, [tenantId]);

  useEffect(() => {
    let mounted = true;

    const loadEntities = async () => {
      if (!tenantId || !relatedObjectTypeKey) {
        setEntities([]);
        return;
      }

      setLoading(true);
      setLoadError("");

      try {
        const data = await listRuntimeEntities(tenantId, relatedObjectTypeKey);

        if (mounted) {
          setEntities(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (mounted) {
          setEntities([]);
          setLoadError("Не удалось загрузить записи. Опубликуйте каталог и создайте записи.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadEntities();

    return () => {
      mounted = false;
    };
  }, [tenantId, relatedObjectTypeKey]);

  if (!relationKey) {
    return (
      <p className="designer-field-form__hint">
        Сначала настройте связь для поля.
      </p>
    );
  }

  if (!relatedObjectTypeKey) {
    return (
      <p className="designer-field-form__hint">
        Не удалось определить связанный тип объекта.
      </p>
    );
  }

  return (
    <div className="designer-field-form__group">
      <select
        className="designer-select"
        value={String(value || "")}
        disabled={loading || entities.length === 0}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="">Выберите запись</option>
        {entities.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {buildEntityLabel(entity)}
          </option>
        ))}
      </select>
      {loading ? (
        <p className="designer-field-form__hint">Загрузка записей…</p>
      ) : null}
      {loadError ? <p className="designer-field-form__error">{loadError}</p> : null}
      {!loading && !loadError && entities.length === 0 ? (
        <p className="designer-field-form__hint">
          Нет доступных записей для выбора.
        </p>
      ) : null}
    </div>
  );
}
