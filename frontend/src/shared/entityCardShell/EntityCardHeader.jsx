import {
  entityCardHeaderCloseButtonStyle,
  entityCardHeaderLeftStyle,
  entityCardHeaderMetaStyle,
  entityCardHeaderStatusBadgeStyle,
  entityCardHeaderStyle,
  entityCardHeaderTitleStyle,
  entityCardHeaderTitleWrapStyle,
} from "./styles/entityCardHeaderStyles";

export default function EntityCardHeader({
  title = "",
  meta = "",
  status = "",
  onClose,
  actions = null,
  titleId = null,
}) {
  return (
    <header style={entityCardHeaderStyle}>
      <div style={entityCardHeaderLeftStyle}>
        <div style={entityCardHeaderTitleWrapStyle}>
          <h2 id={titleId || undefined} style={entityCardHeaderTitleStyle}>
            {title || "Объект"}
          </h2>
          {meta ? <div style={entityCardHeaderMetaStyle}>{meta}</div> : null}
        </div>

        {status ? (
          <span style={entityCardHeaderStatusBadgeStyle}>{status}</span>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {actions}
        <button
          type="button"
          onClick={onClose}
          style={entityCardHeaderCloseButtonStyle}
          aria-label="Закрыть карточку"
        >
          ×
        </button>
      </div>
    </header>
  );
}
