import { useEffect } from "react";

import { clampMenuPosition } from "../utils/pageCanvasContextMenuUtils";

const TOAST_WIDTH = 320;

export default function PageCanvasToast({
  message,
  anchor,
  onDismiss,
  autoCloseMs = 6000,
}) {
  useEffect(() => {
    if (!message || !autoCloseMs) return;

    const timer = window.setTimeout(() => {
      onDismiss?.();
    }, autoCloseMs);

    return () => window.clearTimeout(timer);
  }, [message, autoCloseMs, onDismiss]);

  if (!message) return null;

  const position = anchor
    ? clampMenuPosition(anchor.x, anchor.y, TOAST_WIDTH, 72)
    : {
        x: 16,
        y: window.innerHeight - 88,
      };

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 10060,
        width: TOAST_WIDTH,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #FECACA",
        background: "#FEF2F2",
        color: "#991B1B",
        fontSize: 13,
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        boxSizing: "border-box",
      }}
    >
      <span style={{ lineHeight: 1.45 }}>{message}</span>

      <button
        type="button"
        onClick={onDismiss}
        title="Закрыть"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          border: "none",
          borderRadius: 6,
          background: "transparent",
          color: "#991B1B",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
