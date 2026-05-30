import { getLegacyStorageCreationNoticeMessage } from "../legacyStorageNoticeMessages";

const containerStyle = {
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #475569",
  background: "rgba(15, 23, 42, 0.55)",
  color: "#e2e8f0",
  fontSize: 12,
  lineHeight: 1.55,
  whiteSpace: "pre-line",
};

const titleStyle = {
  margin: "0 0 8px",
  fontSize: 13,
  fontWeight: 700,
  color: "#f8fafc",
};

/**
 * Explains that legacy Universal Table storage creation is disabled (not Table View UI).
 */
export default function LegacyStorageNotice({
  className = "",
  style = {},
  title = "Legacy storage",
}) {
  return (
    <div
      className={className}
      style={{ ...containerStyle, ...style }}
      role="note"
    >
      {title ? <p style={titleStyle}>{title}</p> : null}
      <p style={{ margin: 0 }}>{getLegacyStorageCreationNoticeMessage()}</p>
    </div>
  );
}
