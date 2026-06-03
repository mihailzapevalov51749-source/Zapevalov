export const fieldEditorInputStyle = {
  width: "100%",
  minHeight: 36,
  padding: "8px 10px",
  fontSize: 14,
  lineHeight: 1.4,
  color: "#0f172a",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxSizing: "border-box",
  outline: "none",
};

/** Card inline-edit: no extra «edit frame», blends with view row */
export const fieldEditorInlineInputStyle = {
  ...fieldEditorInputStyle,
  minHeight: 24,
  padding: 0,
  border: "none",
  borderRadius: 0,
  background: "transparent",
  boxShadow: "none",
};

export const fieldEditorTextareaStyle = {
  ...fieldEditorInputStyle,
  minHeight: 72,
  resize: "vertical",
};

export const fieldEditorInlineTextareaStyle = {
  ...fieldEditorInlineInputStyle,
  minHeight: 72,
  padding: "4px 0",
  resize: "vertical",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#ffffff",
};

export const fieldEditorCheckboxRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minHeight: 36,
};
