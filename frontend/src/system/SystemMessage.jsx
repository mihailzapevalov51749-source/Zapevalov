export default function SystemMessage({ children }) {
  return (
    <div
      style={{
        padding: 24,
        color: "#64748b",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
      }}
    >
      {children}
    </div>
  );
}