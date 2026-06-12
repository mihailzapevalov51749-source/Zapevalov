import { getBlockTypeTitle } from "../registry/blockRegistry";

export default function UnsupportedLegacyBlockView({ block }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        height: "100%",
        minHeight: 120,
        padding: 16,
        boxSizing: "border-box",
        color: "#64748b",
        textAlign: "center",
        background: "#f8fafc",
        border: "1px dashed #cbd5e1",
        borderRadius: 8,
      }}
    >
      <strong style={{ color: "#334155", fontSize: 14 }}>
        {block?.title || getBlockTypeTitle(block?.type)}
      </strong>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, maxWidth: 360 }}>
        Legacy-блок Universal Table больше не поддерживается. Используйте Object
        Types и Object Views или удалите блок на canvas.
      </p>
    </div>
  );
}
