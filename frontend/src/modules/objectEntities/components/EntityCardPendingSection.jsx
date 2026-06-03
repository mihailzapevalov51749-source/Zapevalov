const pendingSectionStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 16px",
  borderRadius: 10,
  background: "#F8FAFC",
  border: "1px dashed #CBD5E1",
  color: "#64748B",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 500,
};

export default function EntityCardPendingSection({ message }) {
  if (!message) {
    return null;
  }

  return <div style={pendingSectionStyle}>{message}</div>;
}
