import { useState } from "react";

import RelationFieldRenderer from "../../fieldTypes/relation/RelationFieldRenderer";
import {
  canAddRelationFieldLink,
  resolveRelationFieldAddLabel,
} from "../../fieldTypes/relation/relationFieldCardLabels";
import { relationActionButtonStyle, relationErrorStyle } from "../../fieldTypes/relation/relationFieldStyles";

import RelationFieldPeerSelect from "./RelationFieldPeerSelect";

/**
 * Relation field editing in entity card (Runtime relation-fields API only).
 */
export default function RelationFieldEditor({
  items = [],
  cardinality = "one",
  loading = false,
  mutating = false,
  mutationError = "",
  tenantId = null,
  entityId = null,
  catalog = null,
  peerObjectTypeKey = "",
  onOpenLinkedEntity = null,
  onLinkTarget = null,
  onUnlinkTarget = null,
  readOnly = false,
  placeholder = "",
}) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [deletingEntityId, setDeletingEntityId] = useState(null);

  const hasLinks = Array.isArray(items) && items.length > 0;
  const canAdd = canAddRelationFieldLink({
    cardinality,
    itemCount: items.length,
  });
  const addLabel = resolveRelationFieldAddLabel({ cardinality, hasLinks });

  const handleDelete = async (targetEntityId) => {
    if (!onUnlinkTarget || readOnly) {
      return;
    }

    setDeletingEntityId(String(targetEntityId));
    await onUnlinkTarget(targetEntityId);
    setDeletingEntityId(null);
  };

  const handleSubmit = async (targetEntityId) => {
    if (!onLinkTarget || readOnly) {
      return;
    }

    const result = await onLinkTarget(targetEntityId);

    if (result?.ok !== false) {
      setSelectorOpen(false);
    }
  };

  if (readOnly) {
    return (
      <RelationFieldRenderer
        items={items}
        cardinality={cardinality}
        loading={loading}
        onOpenLinkedEntity={onOpenLinkedEntity}
        readOnly
      />
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <RelationFieldRenderer
        items={items}
        cardinality={cardinality}
        loading={loading}
        emptyLabel={placeholder || "Нет связи"}
        onOpenLinkedEntity={onOpenLinkedEntity}
        onDeleteLink={(targetEntityId) => void handleDelete(targetEntityId)}
        deletingEntityId={deletingEntityId}
      />

      {mutationError ? (
        <div style={relationErrorStyle}>{mutationError}</div>
      ) : null}

      {canAdd && !selectorOpen ? (
        <button
          type="button"
          style={{
            ...relationActionButtonStyle,
            marginTop: 8,
          }}
          disabled={mutating || !peerObjectTypeKey}
          onClick={() => setSelectorOpen(true)}
        >
          {addLabel}
        </button>
      ) : null}

      {selectorOpen ? (
        <RelationFieldPeerSelect
          tenantId={tenantId}
          entityId={entityId}
          catalog={catalog}
          peerObjectTypeKey={peerObjectTypeKey}
          submitting={mutating}
          placeholder={placeholder}
          onSubmit={handleSubmit}
          onCancel={() => setSelectorOpen(false)}
        />
      ) : null}
    </div>
  );
}
