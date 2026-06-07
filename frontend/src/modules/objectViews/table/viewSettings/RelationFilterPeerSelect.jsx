import { useEffect, useMemo, useState } from "react";

import { queryRuntimeEntities } from "../../../designer/api/runtimeQueryApi";
import { resolveRelationFieldPeerObjectTypeKey } from "../../../objectEntities/services/resolveRelationFieldPeerObjectType";
import {
  resolveEntityTitleFieldKey,
  resolvePeerEntityLabel,
} from "../../../objectEntities/services/resolveEntityDisplayTitle";
import { findCatalogObjectType } from "../services/adapters/ObjectTypeTableAdapter";
import { getRuntimeEntity } from "../../../runtimeWriteGateway/api/runtimeEntitiesApi";

const UNAVAILABLE_LABEL = "Запись недоступна";

function resolvePeerLabel(catalog, objectTypeKey, entity) {
  return resolvePeerEntityLabel(catalog, objectTypeKey, entity);
}

function resolveTitleFieldKey(catalog, objectTypeKey) {
  return resolveEntityTitleFieldKey({ catalog, objectTypeKey }) || "";
}

export default function RelationFilterPeerSelect({
  tenantId = null,
  catalog = null,
  anchorObjectTypeKey = "",
  fieldOption = null,
  value = "",
  onChange,
  className = "designer-input",
  style = null,
  disabled = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [peerEntities, setPeerEntities] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const peerObjectTypeKey = useMemo(() => {
    const fromOption = String(fieldOption?.peerObjectTypeKey || "").trim();

    if (fromOption) {
      return fromOption;
    }

    return (
      resolveRelationFieldPeerObjectTypeKey(
        catalog,
        anchorObjectTypeKey,
        {
          settings_json: {
            relation_key: fieldOption?.relationKey,
            role: fieldOption?.role,
            cardinality: fieldOption?.cardinality,
          },
        },
      ) || ""
    );
  }, [anchorObjectTypeKey, catalog, fieldOption]);

  const titleFieldKey = useMemo(
    () => resolveTitleFieldKey(catalog, peerObjectTypeKey),
    [catalog, peerObjectTypeKey],
  );

  const normalizedValue = String(value ?? "").trim();
  const normalizedTenantId = Number(tenantId);

  useEffect(() => {
    if (!normalizedValue || !normalizedTenantId || !peerObjectTypeKey) {
      setSelectedLabel("");
      return undefined;
    }

    const selectedFromList = peerEntities.find(
      (entity) => String(entity?.id ?? "").trim() === normalizedValue,
    );

    if (selectedFromList) {
      setSelectedLabel(resolvePeerLabel(catalog, peerObjectTypeKey, selectedFromList));
      return undefined;
    }

    let cancelled = false;

    async function restoreSelectedLabel() {
      try {
        const entity = await getRuntimeEntity(
          normalizedTenantId,
          peerObjectTypeKey,
          normalizedValue,
        );

        if (cancelled) {
          return;
        }

        setSelectedLabel(resolvePeerLabel(catalog, peerObjectTypeKey, entity));
      } catch {
        if (!cancelled) {
          setSelectedLabel(UNAVAILABLE_LABEL);
        }
      }
    }

    void restoreSelectedLabel();

    return () => {
      cancelled = true;
    };
  }, [catalog, normalizedTenantId, normalizedValue, peerEntities, peerObjectTypeKey]);

  useEffect(() => {
    if (!normalizedTenantId || !peerObjectTypeKey) {
      setPeerEntities([]);
      setLoadError("");
      return undefined;
    }

    let cancelled = false;

    async function loadPeers() {
      setLoading(true);
      setLoadError("");

      try {
        const params = {
          limit: 50,
          offset: 0,
          sort: "created_at",
          order: "desc",
        };

        const trimmedSearch = String(searchTerm || "").trim();

        if (trimmedSearch && titleFieldKey) {
          params.filters = JSON.stringify([
            {
              field: titleFieldKey,
              op: "contains",
              value: trimmedSearch,
            },
          ]);
        }

        const response = await queryRuntimeEntities(
          normalizedTenantId,
          peerObjectTypeKey,
          params,
        );

        if (cancelled) {
          return;
        }

        setPeerEntities(Array.isArray(response?.items) ? response.items : []);
      } catch (err) {
        if (!cancelled) {
          setPeerEntities([]);
          setLoadError(
            err?.response?.data?.detail ||
              err?.message ||
              "Не удалось загрузить записи",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(() => {
      void loadPeers();
    }, trimmedSearchDelay(searchTerm));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedTenantId, peerObjectTypeKey, searchTerm, titleFieldKey]);

  const controlStyle = style || undefined;
  const controlClassName = style ? undefined : className;

  return (
    <div className="ot-filters-value-editor ot-filters-value-editor--relation">
      <input
        className={controlClassName}
        style={controlStyle}
        disabled={disabled || !peerObjectTypeKey}
        value={searchTerm}
        placeholder="Поиск по названию"
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      <select
        className={controlClassName}
        style={controlStyle}
        disabled={disabled || loading || !peerObjectTypeKey}
        value={normalizedValue}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="">
          {loading ? "Загрузка…" : "Выберите запись"}
        </option>
        {normalizedValue && selectedLabel ? (
          <option value={normalizedValue}>{selectedLabel}</option>
        ) : null}
        {peerEntities
          .filter((entity) => String(entity?.id ?? "").trim() !== normalizedValue)
          .map((entity) => {
            const id = String(entity?.id ?? "").trim();

            return (
              <option key={id} value={id}>
                {resolvePeerLabel(catalog, peerObjectTypeKey, entity)}
              </option>
            );
          })}
      </select>

      {loadError ? (
        <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>
          {loadError}
        </div>
      ) : null}
    </div>
  );
}

function trimmedSearchDelay(searchTerm) {
  return String(searchTerm || "").trim() ? 250 : 0;
}
