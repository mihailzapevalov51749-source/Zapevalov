import { useMemo, useState } from "react";

import { resolvePeerEntityLabel } from "../../../modules/objectEntities/services/resolveEntityDisplayTitle";
import { resolveRelationFieldPeerObjectTypeKey } from "../../../modules/objectEntities/services/resolveRelationFieldPeerObjectType";
import { normalizeRelationSettingsFromField } from "../../../modules/designer/components/fields/relationFieldFormUtils";
import { normalizeRelationFormValue } from "../../../modules/objectViews/entity/relationFormValueUtils";
import { canAddRelationFieldLink } from "../../fieldTypes/relation/relationFieldCardLabels";
import RelationFieldRenderer from "../../fieldTypes/relation/RelationFieldRenderer";
import {
  relationActionButtonStyle,
  relationSelectControlStyle,
} from "../../fieldTypes/relation/relationFieldStyles";
import useRelationPeerEntities from "../hooks/useRelationPeerEntities";

function resolvePeerLabel(catalog, objectTypeKey, entity) {
  return resolvePeerEntityLabel(catalog, objectTypeKey, entity);
}

function buildSelectedItems(selectedIds, peerEntities, catalog, peerObjectTypeKey) {
  const peerById = new Map(
    peerEntities.map((entity) => [String(entity?.id ?? "").trim(), entity]),
  );

  return selectedIds.map((entityId) => {
    const peer = peerById.get(entityId);

    return {
      entity_id: entityId,
      title: peer
        ? resolvePeerLabel(catalog, peerObjectTypeKey, peer)
        : entityId,
    };
  });
}

function CreateModePeerSelect({
  peerEntities = [],
  catalog = null,
  peerObjectTypeKey = "",
  loading = false,
  disabled = false,
  placeholder = "",
  emptyMessage = "Нет доступных записей",
  onSelect,
}) {
  return (
    <select
      value=""
      onChange={(event) => onSelect?.(event.target.value)}
      style={relationSelectControlStyle}
      disabled={disabled || loading || !peerEntities.length}
    >
      <option value="">
        {loading
          ? "Загрузка…"
          : peerEntities.length
            ? placeholder || "Выберите запись"
            : emptyMessage}
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
  );
}

/**
 * Create-mode relation selector (pending links before entityId exists).
 * Does not reuse existing-entity card UI with add-link action.
 */
export default function QuickCreateRelationField({
  fieldDef = null,
  value,
  onChange,
  tenantId = null,
  catalog = null,
  objectTypeKey = null,
  readOnly = false,
  placeholder = "",
}) {
  const [addSelectorOpen, setAddSelectorOpen] = useState(false);

  const settings =
    fieldDef?.settings && typeof fieldDef.settings === "object"
      ? fieldDef.settings
      : {};

  const { cardinality } = normalizeRelationSettingsFromField(settings);
  const isMany = String(cardinality) === "many";
  const selectedIds = normalizeRelationFormValue(value);
  const peerObjectTypeKey = resolveRelationFieldPeerObjectTypeKey(
    catalog,
    objectTypeKey,
    fieldDef,
  );

  const { peerEntities, loading, loadError } = useRelationPeerEntities({
    tenantId,
    peerObjectTypeKey,
    enabled: Boolean(peerObjectTypeKey),
  });

  const selectedItems = useMemo(
    () => buildSelectedItems(selectedIds, peerEntities, catalog, peerObjectTypeKey),
    [catalog, peerEntities, peerObjectTypeKey, selectedIds],
  );

  const availablePeerEntities = useMemo(
    () =>
      peerEntities.filter(
        (entity) => !selectedIds.includes(String(entity?.id ?? "").trim()),
      ),
    [peerEntities, selectedIds],
  );

  const canAddMore = canAddRelationFieldLink({
    cardinality,
    itemCount: selectedIds.length,
  });

  const handleSelectPeer = (nextPeerId) => {
    const normalizedPeerId = String(nextPeerId ?? "").trim();

    if (!normalizedPeerId || readOnly) {
      return;
    }

    if (isMany) {
      if (selectedIds.includes(normalizedPeerId)) {
        return;
      }

      onChange?.([...selectedIds, normalizedPeerId]);
      setAddSelectorOpen(false);
      return;
    }

    onChange?.([normalizedPeerId]);
  };

  const handleRemovePeer = (entityId) => {
    if (readOnly) {
      return;
    }

    onChange?.(selectedIds.filter((item) => item !== entityId));
    setAddSelectorOpen(false);
  };

  const handleSingleSelectChange = (event) => {
    const nextValue = String(event.target.value ?? "").trim();
    onChange?.(nextValue ? [nextValue] : []);
  };

  const selectDisabled = loading || !peerObjectTypeKey;
  const onePlaceholder = placeholder || "Выберите запись";
  const manyPlaceholder = placeholder || "Выберите записи";

  if (readOnly) {
    return (
      <RelationFieldRenderer
        items={selectedItems}
        cardinality={cardinality}
        loading={loading}
        emptyLabel={placeholder || "—"}
        readOnly
      />
    );
  }

  if (!isMany) {
    return (
      <div style={{ width: "100%", display: "grid", gap: 6 }}>
        <select
          value={selectedIds[0] || ""}
          onChange={handleSingleSelectChange}
          style={relationSelectControlStyle}
          disabled={selectDisabled}
        >
          <option value="">
            {loading ? "Загрузка…" : onePlaceholder}
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

        {loadError ? (
          <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>
            {loadError}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "grid", gap: 8 }}>
      {selectedIds.length === 0 ? (
        <CreateModePeerSelect
          peerEntities={availablePeerEntities}
          catalog={catalog}
          peerObjectTypeKey={peerObjectTypeKey}
          loading={loading}
          disabled={selectDisabled}
          placeholder={manyPlaceholder}
          onSelect={handleSelectPeer}
        />
      ) : (
        <>
          <RelationFieldRenderer
            items={selectedItems}
            cardinality={cardinality}
            loading={loading}
            onDeleteLink={handleRemovePeer}
            readOnly={false}
          />

          {canAddMore && !addSelectorOpen ? (
            <button
              type="button"
              style={relationActionButtonStyle}
              disabled={selectDisabled}
              onClick={() => setAddSelectorOpen(true)}
            >
              + Добавить
            </button>
          ) : null}

          {addSelectorOpen ? (
            <div style={{ display: "grid", gap: 6 }}>
              <CreateModePeerSelect
                peerEntities={availablePeerEntities}
                catalog={catalog}
                peerObjectTypeKey={peerObjectTypeKey}
                loading={loading}
                disabled={selectDisabled}
                placeholder={manyPlaceholder}
                onSelect={handleSelectPeer}
              />

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  style={relationActionButtonStyle}
                  onClick={() => setAddSelectorOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {loadError ? (
        <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>
          {loadError}
        </div>
      ) : null}
    </div>
  );
}
