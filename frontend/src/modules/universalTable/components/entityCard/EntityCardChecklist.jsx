import { useEffect, useMemo, useRef, useState } from "react";

import {
  createChecklistItem,
  deleteChecklistItem,
  getChecklist,
  updateChecklistItem,
} from "../../../../shared/checklists/checklistApi";

const wrapperStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const titleStyle = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: "#0F172A",
};

const counterStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
};

const progressTrackStyle = {
  width: "100%",
  height: 4,
  borderRadius: 999,
  background: "#E2E8F0",
  overflow: "hidden",
};

const progressBarStyle = {
  height: "100%",
  borderRadius: 999,
  background: "#2563EB",
  transition: "width 160ms ease",
};

const listStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const itemStyle = {
  display: "grid",
  gridTemplateColumns: "22px minmax(0, 1fr) 24px",
  alignItems: "center",
  gap: 6,
  minHeight: 30,
  borderRadius: 8,
  padding: "1px 4px",
};

const checkboxStyle = {
  width: 15,
  height: 15,
  margin: 0,
  cursor: "pointer",
};

const itemTextStyle = {
  width: "100%",
  minWidth: 0,
  border: "none",
  background: "transparent",
  fontSize: 14,
  color: "#0F172A",
  outline: "none",
  padding: "4px 2px",
  lineHeight: "20px",
  boxSizing: "border-box",
};

const completedTextStyle = {
  color: "#94A3B8",
  textDecoration: "line-through",
};

const deleteButtonStyle = {
  width: 24,
  height: 24,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "#94A3B8",
  cursor: "pointer",
  fontSize: 17,
  lineHeight: "22px",
  opacity: 0,
};

const addButtonInlineStyle = {
  width: "100%",
  minHeight: 30,
  border: "none",
  background: "transparent",
  color: "#64748B",
  fontSize: 14,
  textAlign: "left",
  cursor: "pointer",
  padding: "4px 4px",
  borderRadius: 8,
};

const addInputStyle = {
  width: "100%",
  height: 30,
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  padding: "0 9px",
  fontSize: 14,
  color: "#0F172A",
  outline: "none",
  boxSizing: "border-box",
};

const emptyStyle = {
  fontSize: 13,
  color: "#94A3B8",
};

function getEntityId(row) {
  return row?.id || row?.row_id || row?.rowId || "";
}

export default function EntityCardChecklist({
  row,
  entityType = "table_row",
  onCountChange,
}) {
  const entityId = getEntityId(row);
  const addInputRef = useRef(null);
  const onCountChangeRef = useRef(onCountChange);

  const [items, setItems] = useState([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const completedCount = useMemo(
    () => items.filter((item) => item.is_completed).length,
    [items]
  );

  const progress = items.length
    ? Math.round((completedCount / items.length) * 100)
    : 0;

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    if (typeof onCountChangeRef.current === "function") {
      onCountChangeRef.current(items.length);
    }
  }, [items.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadChecklist() {
      if (!entityId) return;

      setIsLoading(true);

      try {
        const data = await getChecklist({
          entityType,
          entityId: String(entityId),
        });

        if (isMounted) {
          setItems(data?.items || []);
        }
      } catch (error) {
        console.error("Ошибка загрузки чек-листа:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadChecklist();

    return () => {
      isMounted = false;
    };
  }, [entityId, entityType]);

  useEffect(() => {
    if (!isAdding) return;

    requestAnimationFrame(() => {
      addInputRef.current?.focus();
    });
  }, [isAdding]);

  async function handleAddItem({ keepAdding = true } = {}) {
    const title = draftTitle.trim();

    if (!title || !entityId) return false;

    try {
      const createdItem = await createChecklistItem({
        entityType,
        entityId: String(entityId),
        title,
      });

      setItems((currentItems) => [...currentItems, createdItem]);
      setDraftTitle("");

      if (!keepAdding) {
        setIsAdding(false);
      }

      return true;
    } catch (error) {
      console.error("Ошибка создания пункта чек-листа:", error);
      return false;
    }
  }

  async function handleToggleItem(item) {
    const nextValue = !item.is_completed;

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, is_completed: nextValue }
          : currentItem
      )
    );

    try {
      const updatedItem = await updateChecklistItem(item.id, {
        is_completed: nextValue,
      });

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id ? updatedItem : currentItem
        )
      );
    } catch (error) {
      console.error("Ошибка обновления пункта чек-листа:", error);

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, is_completed: item.is_completed }
            : currentItem
        )
      );
    }
  }

  async function handleUpdateTitle(item, title) {
    const nextTitle = title.trim();

    if (!nextTitle || nextTitle === item.title) return;

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, title: nextTitle }
          : currentItem
      )
    );

    try {
      const updatedItem = await updateChecklistItem(item.id, {
        title: nextTitle,
      });

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id ? updatedItem : currentItem
        )
      );
    } catch (error) {
      console.error("Ошибка переименования пункта чек-листа:", error);

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id ? item : currentItem
        )
      );
    }
  }

  async function handleDeleteItem(item) {
    try {
      await deleteChecklistItem(item.id);

      setItems((currentItems) =>
        currentItems.filter((currentItem) => currentItem.id !== item.id)
      );
    } catch (error) {
      console.error("Ошибка удаления пункта чек-листа:", error);
    }
  }

  function handleCancelAdding() {
    setDraftTitle("");
    setIsAdding(false);
  }

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Чек-лист</h3>

        <div style={counterStyle}>
          {completedCount} / {items.length}
        </div>
      </div>

      <div style={progressTrackStyle}>
        <div
          style={{
            ...progressBarStyle,
            width: `${progress}%`,
          }}
        />
      </div>

      {isLoading && <div style={emptyStyle}>Загрузка...</div>}

      {!isLoading && !items.length && !isAdding && (
        <div style={emptyStyle}>Пункты чек-листа пока не добавлены</div>
      )}

      <div style={listStyle}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              ...itemStyle,
              background:
                hoveredItemId === item.id ? "#F8FAFC" : "transparent",
            }}
            onMouseEnter={() => setHoveredItemId(item.id)}
            onMouseLeave={() => setHoveredItemId(null)}
          >
            <input
              type="checkbox"
              checked={Boolean(item.is_completed)}
              onChange={() => handleToggleItem(item)}
              style={checkboxStyle}
            />

            <input
              type="text"
              defaultValue={item.title}
              onBlur={(event) =>
                handleUpdateTitle(item, event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  event.currentTarget.value = item.title || "";
                  event.currentTarget.blur();
                }
              }}
              style={{
                ...itemTextStyle,
                ...(item.is_completed ? completedTextStyle : {}),
              }}
            />

            <button
              type="button"
              onClick={() => handleDeleteItem(item)}
              style={{
                ...deleteButtonStyle,
                opacity: hoveredItemId === item.id ? 1 : 0,
              }}
              title="Удалить"
            >
              ×
            </button>
          </div>
        ))}

        {isAdding ? (
          <input
            ref={addInputRef}
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => {
              if (!draftTitle.trim()) {
                handleCancelAdding();
              }
            }}
            onKeyDown={async (event) => {
              if (event.key === "Enter") {
                event.preventDefault();

                const isCreated = await handleAddItem({
                  keepAdding: true,
                });

                if (isCreated) {
                  requestAnimationFrame(() => {
                    addInputRef.current?.focus();
                  });
                }
              }

              if (event.key === "Escape") {
                event.preventDefault();
                handleCancelAdding();
              }
            }}
            placeholder="Введите пункт и нажмите Enter"
            style={addInputStyle}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            style={addButtonInlineStyle}
          >
            + Добавить пункт
          </button>
        )}
      </div>
    </div>
  );
}