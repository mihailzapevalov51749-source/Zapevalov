import parentIcon from "../../../assets/icons/GitBranch.svg";

import {
  entityCardParentDividerStyle,
  entityCardParentIconBoxStyle,
  entityCardParentIconStyle,
  entityCardParentIdStyle,
  entityCardParentLabelStyle,
  entityCardParentLeftStyle,
  entityCardParentStyle,
  entityCardParentValueStyle,
} from "../../../shared/entityCardShell/styles/entityCardParentStyles";

import { formatEntityDisplayNumber } from "../services/runtimeEntityCardAdapter";

/**
 * Parent section slot (UT EntityCardParent visual). Data: PR-C5.
 */
export default function ObjectEntityCardParentSection({
  parent = null,
  onOpenParent = null,
}) {
  const hasParent = Boolean(parent?.label);

  const canOpen =
    hasParent &&
    typeof onOpenParent === "function" &&
    parent.entityId &&
    parent.objectTypeKey;

  const parentNumber = hasParent
    ? parent.displayNumber
      ? formatEntityDisplayNumber(parent.displayNumber)
      : parent.entityId
        ? formatEntityDisplayNumber(parent.entityId)
        : null
    : null;

  const handleClick = () => {
    if (!canOpen) {
      return;
    }

    onOpenParent({
      entityId: parent.entityId,
      objectTypeKey: parent.objectTypeKey,
    });
  };

  return (
    <button
      type="button"
      onClick={hasParent ? handleClick : undefined}
      style={{
        ...entityCardParentStyle,
        cursor: hasParent ? "pointer" : "default",
      }}
      data-object-entity-parent-section=""
    >
      <div style={entityCardParentLeftStyle}>
        <div style={entityCardParentIconBoxStyle}>
          <img src={parentIcon} alt="" style={entityCardParentIconStyle} />
        </div>

        <span style={entityCardParentLabelStyle}>Родительская запись</span>

        <span style={entityCardParentDividerStyle}>›</span>

        <span
          style={{
            ...entityCardParentValueStyle,
            color: hasParent ? "#0F172A" : entityCardParentValueStyle.color,
            fontWeight: hasParent ? 700 : 500,
            textDecoration: "none",
            paddingBottom: hasParent ? 1 : 0,
            borderBottom: hasParent
              ? "1px solid rgba(15, 23, 42, 0.18)"
              : "none",
          }}
        >
          {hasParent ? parent.label : "Не указана"}
        </span>
      </div>

      <span style={entityCardParentIdStyle}>
        ID: {hasParent && parentNumber ? parentNumber : "—"}
      </span>
    </button>
  );
}
