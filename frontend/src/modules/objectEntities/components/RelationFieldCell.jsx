import useRelationFieldState from "../hooks/useRelationFieldState";
import { resolveRelationFieldPeerObjectTypeKey } from "../services/resolveRelationFieldPeerObjectType";
import RelationFieldEditor from "../../../shared/fieldEditors/editors/RelationFieldEditor";
import { relationErrorStyle } from "../../../shared/fieldTypes/relation/relationFieldStyles";

import textIcon from "../../../assets/icons/ClipboardList.svg";

import {
  entityCardFieldCellStyle,
  entityCardFieldIconBoxStyle,
  entityCardFieldIconStyle,
  entityCardFieldLabelStyle,
  entityCardFieldTextBoxStyle,
  entityCardFieldValueStyle,
} from "../../../shared/entityCardShell/styles/entityCardFieldsGridStyles";

const pendingStyle = {
  fontSize: 12,
  color: "#64748B",
  fontWeight: 500,
};

export default function RelationFieldCell({
  field,
  tenantId = null,
  entityId = null,
  objectTypeKey = null,
  catalog = null,
  readOnly = false,
  isCreate = false,
  onOpenRelatedEntity = null,
}) {
  const fieldKey = String(field?.key || "").trim();
  const peerObjectTypeKey = resolveRelationFieldPeerObjectTypeKey(
    catalog,
    objectTypeKey,
    field,
  );

  const relationState = useRelationFieldState({
    tenantId,
    entityId,
    fieldKey,
    enabled: !isCreate && Boolean(entityId) && Boolean(fieldKey),
  });

  const handleOpenLinkedEntity = ({ entityId: linkedEntityId }) => {
    if (!linkedEntityId) {
      return;
    }

    onOpenRelatedEntity?.({
      entityId: linkedEntityId,
      objectTypeKey: peerObjectTypeKey || null,
    });
  };

  return (
    <div style={entityCardFieldCellStyle}>
      <div style={entityCardFieldIconBoxStyle}>
        <img src={textIcon} alt="" style={entityCardFieldIconStyle} />
      </div>

      <div style={entityCardFieldTextBoxStyle}>
        <div style={entityCardFieldLabelStyle}>{field.label || field.key}</div>

        <div style={entityCardFieldValueStyle}>
          {isCreate ? (
            <div style={pendingStyle}>
              Сохраните запись, чтобы добавить связь
            </div>
          ) : (
            <RelationFieldEditor
              items={relationState.items}
              cardinality={relationState.cardinality}
              loading={relationState.loading}
              mutating={relationState.mutating}
              mutationError={relationState.mutationError}
              tenantId={tenantId}
              entityId={entityId}
              catalog={catalog}
              peerObjectTypeKey={peerObjectTypeKey}
              onOpenLinkedEntity={handleOpenLinkedEntity}
              onLinkTarget={relationState.linkTarget}
              onUnlinkTarget={relationState.unlinkTarget}
              readOnly={readOnly}
            />
          )}
        </div>

        {relationState.error ? (
          <div style={relationErrorStyle}>{relationState.error}</div>
        ) : null}
      </div>
    </div>
  );
}
