import { useEffect, useState } from "react";

export default function TableTitle({
  table,
  isEditMode,
  onSaveTitle,
  onAfterChange,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    setTitleDraft(table?.title || "Таблица");
  }, [table?.title]);

  const handleSave = async () => {
    const title = titleDraft.trim();

    if (!title) {
      setTitleDraft(table?.title || "Таблица");
      setIsEditing(false);
      onAfterChange?.();
      return;
    }

    if (title !== table?.title) {
      await onSaveTitle?.(title);
    }

    setIsEditing(false);
    onAfterChange?.();
  };

  const handleCancel = () => {
    setTitleDraft(table?.title || "Таблица");
    setIsEditing(false);
    onAfterChange?.();
  };

  return (
    <div
      data-table-action="true"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        marginBottom: 8,
        padding: "0 2px",
        boxSizing: "border-box",
      }}
      onClick={(event) => event.stopPropagation()}
    >
      {isEditing ? (
        <input
          data-table-action="true"
          value={titleDraft}
          autoFocus
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={handleSave}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSave();
            }

            if (event.key === "Escape") {
              event.preventDefault();
              handleCancel();
            }
          }}
          style={{
            width: "100%",
            maxWidth: 480,
            height: 34,
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            background: "#ffffff",
            padding: "0 10px",
            fontSize: 18,
            fontWeight: 700,
            color: "#0f172a",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      ) : (
        <div
          data-table-action="true"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (!isEditMode) return;

            setTitleDraft(table?.title || "Таблица");
            setIsEditing(true);
          }}
          title={
            isEditMode
              ? "Нажмите, чтобы переименовать таблицу"
              : table?.title || "Таблица"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 34,
            maxWidth: "100%",
            fontSize: 18,
            fontWeight: 700,
            color: "#0f172a",
            cursor: isEditMode ? "pointer" : "default",
            padding: "2px 4px",
            borderRadius: 8,
            boxSizing: "border-box",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {table?.title || "Таблица"}
        </div>
      )}
    </div>
  );
}