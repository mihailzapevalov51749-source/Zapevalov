export default function EmptyDropZone() {
  return (
    <div
      style={{
        minHeight: 240,
        border: "1px dashed #cbd5e1",
        borderRadius: 16,
        background: "#ffffff",
        color: "#64748b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        boxSizing: "border-box",
      }}
    >
      Перетащи сюда виджет «Раздел»
    </div>
  );
}