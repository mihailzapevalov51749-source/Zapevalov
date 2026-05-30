import {
  getLegacyStorageExistingSupportMessage,
  LEGACY_STORAGE_EXISTING_SUPPORT_TITLE,
} from "../legacyStorageExistingMessages";

const containerStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #475569",
  background: "rgba(15, 23, 42, 0.55)",
  color: "#cbd5e1",
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "pre-line",
};

const titleStyle = {
  margin: "0 0 6px",
  fontSize: 12,
  fontWeight: 700,
  color: "#e2e8f0",
};

/**
 * Panel marker for existing legacy Universal Table storage (block settings / editor).
 */
export default function LegacyStorageExistingSupportNotice({
  className = "",
  style = {},
  title = LEGACY_STORAGE_EXISTING_SUPPORT_TITLE,
}) {
  return (
    <div
      className={className}
      style={{ ...containerStyle, ...style }}
      role="note"
      data-legacy-storage-marker="existing-support"
    >
      {title ? <p style={titleStyle}>{title}</p> : null}
      <p style={{ margin: 0 }}>{getLegacyStorageExistingSupportMessage()}</p>
    </div>
  );
}
