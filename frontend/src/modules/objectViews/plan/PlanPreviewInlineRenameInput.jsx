import { useEffect, useRef, useState } from "react";

export default function PlanPreviewInlineRenameInput({
  value = "",
  ariaLabel = "Переименовать",
  className = "",
  onCommit,
  onCancel,
}) {
  const inputRef = useRef(null);
  const [draftValue, setDraftValue] = useState(String(value || ""));

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = draftValue.trim();

    if (!trimmed) {
      onCancel?.();
      return;
    }

    onCommit?.(trimmed);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      value={draftValue}
      aria-label={ariaLabel}
      onChange={(event) => setDraftValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }

        if (event.key === "Escape") {
          event.preventDefault();
          onCancel?.();
        }
      }}
      onBlur={commit}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    />
  );
}
