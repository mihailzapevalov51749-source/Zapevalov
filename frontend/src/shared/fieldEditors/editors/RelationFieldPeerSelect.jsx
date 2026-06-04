import { useEffect, useState } from "react";

import { queryRuntimeEntities } from "../../../modules/designer/api/runtimeQueryApi";
import { resolveEntityTitle } from "../../../modules/objectEntities/services/resolveEntityTitle";
import { findCatalogObjectType } from "../../../modules/objectViews/table/services/adapters/ObjectTypeTableAdapter";
import {
  relationActionButtonStyle,
  relationSelectControlStyle,
  relationSelectorStyle,
} from "../../fieldTypes/relation/relationFieldStyles";

function resolvePeerLabel(catalog, objectTypeKey, entity) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fields = Array.isArray(objectType?.fields) ? objectType.fields : [];
  const titleField = fields.find((field) => field?.is_title || field?.isTitle);
  const titleFieldKey = String(titleField?.key || titleField?.field_key || "").trim();
  const values =
    entity?.values && typeof entity.values === "object" ? entity.values : {};
  const title = resolveEntityTitle(values, titleFieldKey);

  return title || String(entity?.id || "Запись");
}

export default function RelationFieldPeerSelect({
  tenantId,
  entityId,
  catalog = null,
  peerObjectTypeKey = "",
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const [peerEntities, setPeerEntities] = useState([]);
  const [selectedPeerEntityId, setSelectedPeerEntityId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const normalizedPeerType = String(peerObjectTypeKey ?? "").trim();
    const normalizedTenantId = Number(tenantId);

    if (!normalizedPeerType || !normalizedTenantId) {
      setPeerEntities([]);
      setSelectedPeerEntityId("");
      setLoadError("");
      return undefined;
    }

    let cancelled = false;

    async function loadPeers() {
      setLoading(true);
      setLoadError("");
      setSelectedPeerEntityId("");

      try {
        const response = await queryRuntimeEntities(
          normalizedTenantId,
          normalizedPeerType,
          {
            limit: 50,
            offset: 0,
            sort: "created_at",
            order: "desc",
          },
        );

        if (cancelled) {
          return;
        }

        const items = Array.isArray(response?.items) ? response.items : [];
        const normalizedEntityId = String(entityId ?? "").trim();

        setPeerEntities(
          items.filter((item) => String(item?.id ?? "").trim() !== normalizedEntityId),
        );
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

    void loadPeers();

    return () => {
      cancelled = true;
    };
  }, [catalog, entityId, peerObjectTypeKey, tenantId]);

  return (
    <div style={relationSelectorStyle}>
      <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 600 }}>
        Связанная запись
        <select
          value={selectedPeerEntityId}
          onChange={(event) => setSelectedPeerEntityId(event.target.value)}
          style={relationSelectControlStyle}
          disabled={submitting || loading || !peerObjectTypeKey}
        >
          <option value="">
            {loading ? "Загрузка…" : "Выберите запись"}
          </option>
          {peerEntities.map((entity) => {
            const id = String(entity?.id ?? "").trim();

            return (
              <option key={id} value={id}>
                {resolvePeerLabel(catalog, peerObjectTypeKey, entity)}
              </option>
            );
          })}
        </select>
      </label>

      {loadError ? (
        <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>
          {loadError}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          style={relationActionButtonStyle}
          disabled={submitting}
          onClick={onCancel}
        >
          Отмена
        </button>
        <button
          type="button"
          style={relationActionButtonStyle}
          disabled={submitting || !selectedPeerEntityId}
          onClick={() => onSubmit?.(selectedPeerEntityId)}
        >
          {submitting ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
