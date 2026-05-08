import { useEffect, useRef, useState } from "react";

import { cellInputStyle } from "../../styles/tableStyles";

const CELL_EDITOR_MIN_HEIGHT = 28;
const READ_ONLY_MAX_LINES = 3;
const READ_ONLY_LINE_HEIGHT = 18;

const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

const getJustifyByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

export default function TextCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
  isPrimary = false,
}) {
  const textareaRef = useRef(null);
  const lastExternalValueRef = useRef(value ?? "");

  const [draftValue, setDraftValue] = useState(value ?? "");

  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);
  const fontWeight = isPrimary ? 700 : 400;

  const autoResizeTextarea = () => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  };

  useEffect(() => {
    const nextValue = value ?? "";

    if (nextValue === lastExternalValueRef.current) return;

    lastExternalValueRef.current = nextValue;
    setDraftValue(nextValue);
  }, [value]);

  useEffect(() => {
    if (readOnly) return;

    const frameId = requestAnimationFrame(autoResizeTextarea);

    return () => cancelAnimationFrame(frameId);
  }, [draftValue, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    if (!isPrimary) return;
    if (!textareaRef.current) return;

    const shouldAutoFocus =
      textareaRef.current.closest("[data-primary-cell-editor='true']") &&
      textareaRef.current.closest("[data-universal-table-row-id]");

    if (!shouldAutoFocus) return;

    const frameId = requestAnimationFrame(() => {
      textareaRef.current?.focus?.();
      textareaRef.current?.select?.();
    });

    return () => cancelAnimationFrame(frameId);
  }, [readOnly, isPrimary]);

  const commitDraft = () => {
    const normalizedDraft = draftValue ?? "";
    const normalizedExternal = value ?? "";

    if (normalizedDraft === normalizedExternal) return;

    lastExternalValueRef.current = normalizedDraft;
    onChange?.(normalizedDraft);
  };

  if (readOnly) {
    const text = value ?? "";

    return (
      <div
        data-table-action="true"
        title={text}
        style={{
          width: "100%",
          minHeight: CELL_EDITOR_MIN_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent,
          padding: "4px 6px",
          boxSizing: "border-box",
          fontSize: 13,
          lineHeight: `${READ_ONLY_LINE_HEIGHT}px`,
          fontWeight,
          color: text ? "#0f172a" : "#94a3b8",
          overflow: "hidden",
          cursor: "default",
          textAlign: align,
        }}
      >
        <span
          style={{
            minWidth: 0,
            maxWidth: "100%",
            display: "-webkit-box",
            WebkitLineClamp: READ_ONLY_MAX_LINES,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            whiteSpace: "normal",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            textAlign: align,
          }}
        >
          {text || "—"}
        </span>
      </div>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      data-table-action="true"
      data-primary-cell-input={isPrimary ? "true" : undefined}
      value={draftValue}
      rows={1}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        setDraftValue(event.target.value);
      }}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          commitDraft();
          event.currentTarget.blur();
        }
      }}
      style={{
        ...cellInputStyle,
        width: "100%",
        minHeight: CELL_EDITOR_MIN_HEIGHT,
        maxHeight: 240,
        border: "none",
        outline: "none",
        background: "transparent",
        resize: "none",
        overflow: "hidden",
        textAlign: align,
        fontWeight,
        color: "#0f172a",
        fontSize: 13,
        lineHeight: "18px",
        padding: "5px 6px",
        boxSizing: "border-box",
      }}
    />
  );
}