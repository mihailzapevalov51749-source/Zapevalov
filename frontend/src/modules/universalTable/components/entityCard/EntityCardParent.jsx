import parentIcon from "../../../../assets/icons/GitBranch.svg";

import {
  entityCardParentStyle,
  entityCardParentLeftStyle,
  entityCardParentIconBoxStyle,
  entityCardParentIconStyle,
  entityCardParentLabelStyle,
  entityCardParentDividerStyle,
  entityCardParentValueStyle,
  entityCardParentIdStyle,
} from "./styles/entityCardParentStyles";

export default function EntityCardParent({ row, onOpenParent }) {
  const parentTitle = row?.parentTitle || row?.parent?.title || null;
  const parentId = row?.parentId || row?.parent?.id || null;

  const hasParent = Boolean(parentTitle);

  return (
    <button
      type="button"
      onClick={hasParent ? onOpenParent : undefined}
      style={{
        ...entityCardParentStyle,
        cursor: hasParent ? "pointer" : "default",
      }}
    >
      <div style={entityCardParentLeftStyle}>
        <div style={entityCardParentIconBoxStyle}>
          <img src={parentIcon} alt="" style={entityCardParentIconStyle} />
        </div>

        <span style={entityCardParentLabelStyle}>Родительская задача</span>

        <span style={entityCardParentDividerStyle}>›</span>

        <span style={entityCardParentValueStyle}>
          {parentTitle || "Не указана"}
        </span>
      </div>

      {parentId && <span style={entityCardParentIdStyle}>ID: {parentId}</span>}
    </button>
  );
}