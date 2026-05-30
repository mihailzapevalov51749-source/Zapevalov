import { getLegacyStorageExistingSupportShort } from "../legacyStorageExistingMessages";

const badgeStyle = {
  position: "absolute",
  top: 8,
  right: 8,
  zIndex: 4,
  maxWidth: "min(280px, calc(100% - 16px))",
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid #64748b",
  background: "rgba(15, 23, 42, 0.88)",
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.35,
  pointerEvents: "none",
  userSelect: "none",
  boxSizing: "border-box",
};

/**
 * Compact marker for existing legacy Universal Table storage blocks on the page canvas.
 */
export default function LegacyStorageExistingBadge({ className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{ ...badgeStyle, ...style }}
      role="status"
      aria-label={getLegacyStorageExistingSupportShort()}
      title={getLegacyStorageExistingSupportShort()}
      data-legacy-storage-marker="existing"
    >
      {getLegacyStorageExistingSupportShort()}
    </div>
  );
}
