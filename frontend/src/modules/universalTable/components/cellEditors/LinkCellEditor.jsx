import { useEffect, useRef, useState } from "react";

import { cellInputStyle } from "../../styles/tableStyles";

const CELL_EDITOR_HEIGHT = 28;
const LINK_EDITOR_INPUT_HEIGHT = 24;

const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

const getJustifyByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

const normalizeLinkValue = (value) => {
  if (value && typeof value === "object") {
    return {
      url: value.url || "",
      label: value.label || "",
    };
  }

  return {
    url: value || "",
    label: "",
  };
};

export default function LinkCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
  isPrimary = false,
}) {
  const [isLinkEditing, setIsLinkEditing] = useState(false);
  const linkEditorRef = useRef(null);

  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);

  const linkValue = normalizeLinkValue(value);
  const displayText = linkValue.label || linkValue.url;

  const commonInputStyle = {
    ...cellInputStyle,
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    textAlign: align,
    color: "#0f172a",
    fontSize: 13,
    padding: "0 6px",
    boxSizing: "border-box",
  };

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (!isLinkEditing) return;

      const clickedInside = linkEditorRef.current?.contains(event.target);

      if (!clickedInside) {
        setIsLinkEditing(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [isLinkEditing]);

  // READ ONLY
  if (readOnly) {
    return (
      <div
        data-table-action="true"
        style={{
          width: "100%",
          height: CELL_EDITOR_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent,
          padding: "0 6px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {displayText ? (
          <a
            href={linkValue.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            style={{
              color: "#2563eb",
              fontSize: 13,
              fontWeight: isPrimary ? 700 : 600,
              textDecoration: "none",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              textAlign: align,
            }}
            title={linkValue.url}
          >
            {displayText}
          </a>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
        )}
      </div>
    );
  }

  // EMPTY
  if (!isLinkEditing && !displayText) {
    return (
      <button
        type="button"
        data-table-action="true"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsLinkEditing(true);
        }}
        style={{
          width: "100%",
          height: CELL_EDITOR_HEIGHT,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: "0 6px",
          display: "flex",
          alignItems: "center",
          justifyContent,
          color: "#94a3b8",
          fontSize: 13,
        }}
      >
        —
      </button>
    );
  }

  // VIEW
  if (!isLinkEditing && displayText) {
    return (
      <div
        data-table-action="true"
        style={{
          width: "100%",
          height: CELL_EDITOR_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent,
          gap: 4,
          padding: "0 6px",
          boxSizing: "border-box",
        }}
      >
        <a
          href={linkValue.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          style={{
            minWidth: 0,
            color: "#2563eb",
            fontSize: 13,
            fontWeight: isPrimary ? 700 : 600,
            textDecoration: "none",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            textAlign: align,
          }}
          title={linkValue.url}
        >
          {displayText}
        </a>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsLinkEditing(true);
          }}
          style={{
            width: 20,
            height: 20,
            border: "1px solid #dbe3ef",
            borderRadius: 6,
            background: "#ffffff",
            cursor: "pointer",
            color: "#64748b",
            fontSize: 11,
          }}
        >
          ✎
        </button>
      </div>
    );
  }

  // EDIT
  return (
    <div
      ref={linkEditorRef}
      data-table-action="true"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        padding: 2,
        boxSizing: "border-box",
      }}
    >
      <input
        type="text"
        placeholder="Текст"
        value={linkValue.label}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) =>
          onChange?.({
            ...linkValue,
            label: event.target.value,
          })
        }
        style={{
          ...commonInputStyle,
          height: LINK_EDITOR_INPUT_HEIGHT,
          fontSize: 12,
        }}
      />

      <input
        type="url"
        placeholder="https://..."
        value={linkValue.url}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) =>
          onChange?.({
            ...linkValue,
            url: event.target.value,
          })
        }
        style={{
          ...commonInputStyle,
          height: LINK_EDITOR_INPUT_HEIGHT,
          fontSize: 12,
        }}
      />
    </div>
  );
}