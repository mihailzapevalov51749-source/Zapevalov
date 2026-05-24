import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import UniversalViewFieldsSelector from "./UniversalViewFieldsSelector";

import { universalViewSettingsModalStyles as styles } from "./universalViewSettingsModalStyles";

const VIEW_TYPES = [
  { value: "table", label: "Таблица" },
  { value: "tree", label: "Дерево" },
  { value: "composite", label: "Составное" },
  { value: "cards", label: "Карточки" },
  { value: "kanban", label: "Канбан" },
  { value: "calendar", label: "Календарь" },
  { value: "org_structure", label: "Оргструктура" },
  { value: "bpmn", label: "BPMN" },
];

const BLOCK_TYPES = [
  { value: "table", label: "Таблица" },
  { value: "tree", label: "Дерево" },
  { value: "cards", label: "Карточки" },
  { value: "kanban", label: "Канбан" },
  { value: "calendar", label: "Календарь" },
  { value: "org_structure", label: "Оргструктура" },
  { value: "bpmn", label: "BPMN" },
];

const MIN_WIDTH = 390;
const MIN_HEIGHT = 420;

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 620;
const DEFAULT_X = 80;
const DEFAULT_Y = 60;

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function getViewportSize() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth || 1200,
    height: window.innerHeight || document.documentElement.clientHeight || 800,
  };
}

function createBlock(index = 0) {
  return {
    id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "tree",
    title: "Новый блок",
    fields: [],
    x: index * 420,
    y: 0,
    width: 420,
    height: 420,
    settings: {},
  };
}

function normalizeSettings(settings) {
  if (!settings || typeof settings !== "object") {
    return {
      fields: [],
      blocks: [],
      modal: null,
    };
  }

  return {
    ...settings,
    fields: Array.isArray(settings.fields) ? settings.fields : [],
    blocks: Array.isArray(settings.blocks) ? settings.blocks : [],
    modal:
      settings.modal && typeof settings.modal === "object"
        ? settings.modal
        : null,
  };
}

function normalizeModalState(modalSettings) {
  const viewport = getViewportSize();

  const rawWidth = Number(modalSettings?.width ?? DEFAULT_WIDTH);
  const rawHeight = Number(modalSettings?.height ?? DEFAULT_HEIGHT);

  const width = clamp(rawWidth, MIN_WIDTH, viewport.width);
  const height = clamp(rawHeight, MIN_HEIGHT, viewport.height);

  const rawX = Number(modalSettings?.x ?? DEFAULT_X);
  const rawY = Number(modalSettings?.y ?? DEFAULT_Y);

  return {
    position: {
      x: clamp(rawX, 0, Math.max(0, viewport.width - width)),
      y: clamp(rawY, 0, Math.max(0, viewport.height - height)),
    },
    size: {
      width,
      height,
    },
  };
}

function getBlockFields(block) {
  if (Array.isArray(block?.fields)) return block.fields;
  if (Array.isArray(block?.settings?.fields)) return block.settings.fields;

  return [];
}

function CompositeBlockEditor({
  block,
  fields,
  collapsed,
  onToggleCollapse,
  onChange,
  onDelete,
}) {
  const blockTitle = block?.title || block?.name || "Новый блок";
  const blockType = block?.type || "tree";

  function updateBlock(patch) {
    onChange?.({
      ...block,
      ...patch,
      settings: {
        ...(block?.settings || {}),
        ...(patch.settings || {}),
      },
    });
  }

  function updateBlockFields(nextFields) {
    updateBlock({
      fields: nextFields,
      settings: {
        ...(block?.settings || {}),
        fields: nextFields,
      },
    });
  }

  return (
    <div style={localStyles.blockCard}>
      <div style={localStyles.blockHeader}>
        <button
          type="button"
          style={localStyles.blockCollapseButton}
          onClick={onToggleCollapse}
          title={collapsed ? "Развернуть блок" : "Свернуть блок"}
        >
          {collapsed ? "›" : "⌄"}
        </button>

        <div style={localStyles.blockHeaderText}>
          <div style={localStyles.blockTitle}>{blockTitle}</div>

          <div style={localStyles.blockMeta}>
            {BLOCK_TYPES.find((item) => item.value === blockType)?.label ||
              blockType}
          </div>
        </div>

        <button
          type="button"
          style={localStyles.blockDeleteButton}
          onClick={onDelete}
        >
          Удалить
        </button>
      </div>

      {!collapsed && (
        <div style={localStyles.blockBody}>
          <div style={localStyles.blockGrid}>
            <div style={localStyles.fieldGroup}>
              <label style={localStyles.fieldLabel}>Название блока</label>

              <input
                value={blockTitle}
                onChange={(event) =>
                  updateBlock({
                    title: event.target.value,
                    name: event.target.value,
                  })
                }
                style={localStyles.fieldInput}
                placeholder="Название блока"
              />
            </div>

            <div style={localStyles.fieldGroup}>
              <label style={localStyles.fieldLabel}>Тип блока</label>

              <select
                value={blockType}
                onChange={(event) =>
                  updateBlock({
                    type: event.target.value,
                  })
                }
                style={localStyles.fieldInput}
              >
                {BLOCK_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={localStyles.fieldsTitle}>Поля представления</div>

          <UniversalViewFieldsSelector
            fields={fields}
            selectedFieldIds={getBlockFields(block)}
            onChange={updateBlockFields}
          />
        </div>
      )}
    </div>
  );
}

export default function UniversalViewSettingsModal({
  isOpen,
  view,
  fields = [],
  onClose,
  onSave,
  onLayoutSave,
  onDelete,
}) {
  const modalRef = useRef(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("table");

  const [selectedFieldIds, setSelectedFieldIds] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState({});

  const [position, setPosition] = useState(
    () => normalizeModalState(null).position
  );

  const [size, setSize] = useState(() => normalizeModalState(null).size);

  const isSystemView = Boolean(view?.is_system || view?.isSystem);

  const normalizedSettings = useMemo(
    () => normalizeSettings(view?.settings),
    [view?.settings]
  );

  useEffect(() => {
    if (!isOpen || !view) return;

    const nextSettings = normalizeSettings(view.settings);
    const nextModalState = normalizeModalState(nextSettings.modal);

    setName(view.name || "Представление");
    setType(view.type || "table");

    setSelectedFieldIds(nextSettings.fields);
    setBlocks(nextSettings.blocks);
    setCollapsedBlockIds({});

    setPosition(nextModalState.position);
    setSize(nextModalState.size);
  }, [isOpen, view]);

  if (!isOpen || !view) return null;

  function getModalSettingsPayload(nextPosition = position, nextSize = size) {
    return {
      x: Math.round(nextPosition.x),
      y: Math.round(nextPosition.y),
      width: Math.round(nextSize.width),
      height: Math.round(nextSize.height),
    };
  }

  function buildSettingsPayload(nextPosition = position, nextSize = size) {
    if (type === "composite") {
      return {
        ...normalizedSettings,
        fields: selectedFieldIds,
        blocks,
        modal: getModalSettingsPayload(nextPosition, nextSize),
      };
    }

    return {
      ...normalizedSettings,
      fields: selectedFieldIds,
      blocks: normalizedSettings.blocks,
      modal: getModalSettingsPayload(nextPosition, nextSize),
    };
  }

  function buildViewPayload(nextPosition = position, nextSize = size) {
    const payload = {
      name: name.trim() || view.name || "Представление",
      settings: buildSettingsPayload(nextPosition, nextSize),
    };

    if (!isSystemView) {
      payload.type = type;
    }

    return payload;
  }

  function persistModalLayout(nextPosition = position, nextSize = size) {
    if (!view?.id) return;

    onLayoutSave?.(view.id, buildViewPayload(nextPosition, nextSize));
  }

  function handleTypeChange(nextType) {
    if (isSystemView) return;

    setType(nextType);

    if (nextType === "composite" && !blocks.length) {
      setBlocks([createBlock(0)]);
    }
  }

  function handleAddBlock() {
    const nextBlock = createBlock(blocks.length);

    setBlocks((prev) => [...prev, nextBlock]);

    setCollapsedBlockIds((prev) => ({
      ...prev,
      [nextBlock.id]: false,
    }));
  }

  function handleBlockChange(blockId, nextBlock) {
    setBlocks((prev) =>
      prev.map((block) => (block.id === blockId ? nextBlock : block))
    );
  }

  function handleBlockDelete(blockId) {
    setBlocks((prev) => prev.filter((block) => block.id !== blockId));

    setCollapsedBlockIds((prev) => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
  }

  function handleBlockCollapseToggle(blockId) {
    setCollapsedBlockIds((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  }

  function handleSave() {
    onSave?.(view.id, buildViewPayload());

    onClose?.();
  }

  function startDrag(event) {
    if (event.button !== 0) return;

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = { ...position };
    const startSize = { ...size };

    let latestPosition = startPosition;

    function handleMouseMove(moveEvent) {
      const viewport = getViewportSize();

      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      latestPosition = {
        x: clamp(
          startPosition.x + deltaX,
          0,
          Math.max(0, viewport.width - startSize.width)
        ),
        y: clamp(
          startPosition.y + deltaY,
          0,
          Math.max(0, viewport.height - startSize.height)
        ),
      };

      setPosition(latestPosition);
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      persistModalLayout(latestPosition, startSize);
    }

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function startResize(event, direction) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;

    const startPosition = { ...position };
    const startSize = { ...size };

    let latestPosition = startPosition;
    let latestSize = startSize;

    function handleMouseMove(moveEvent) {
      const viewport = getViewportSize();

      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let nextX = startPosition.x;
      let nextY = startPosition.y;
      let nextWidth = startSize.width;
      let nextHeight = startSize.height;

      if (direction.includes("right")) {
        nextWidth = clamp(
          startSize.width + deltaX,
          MIN_WIDTH,
          viewport.width - startPosition.x
        );
      }

      if (direction.includes("bottom")) {
        nextHeight = clamp(
          startSize.height + deltaY,
          MIN_HEIGHT,
          viewport.height - startPosition.y
        );
      }

      if (direction.includes("left")) {
        const maxDeltaX = startSize.width - MIN_WIDTH;
        const limitedDeltaX = clamp(deltaX, -startPosition.x, maxDeltaX);

        nextX = startPosition.x + limitedDeltaX;
        nextWidth = startSize.width - limitedDeltaX;
      }

      if (direction.includes("top")) {
        const maxDeltaY = startSize.height - MIN_HEIGHT;
        const limitedDeltaY = clamp(deltaY, -startPosition.y, maxDeltaY);

        nextY = startPosition.y + limitedDeltaY;
        nextHeight = startSize.height - limitedDeltaY;
      }

      latestPosition = { x: nextX, y: nextY };
      latestSize = { width: nextWidth, height: nextHeight };

      setPosition(latestPosition);
      setSize(latestSize);
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      persistModalLayout(latestPosition, latestSize);
    }

    document.body.style.userSelect = "none";

    document.body.style.cursor =
      direction.includes("left") || direction.includes("right")
        ? direction.includes("top") || direction.includes("bottom")
          ? "nwse-resize"
          : "col-resize"
        : "row-resize";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  return createPortal(
    <div style={styles.overlay} onMouseDown={onClose}>
      <div
        ref={modalRef}
        style={{
          ...styles.modal,
          width: size.width,
          height: size.height,
          left: position.x,
          top: position.y,
          margin: 0,
          position: "fixed",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            ...styles.header,
            cursor: "grab",
            userSelect: "none",
          }}
          onMouseDown={startDrag}
        >
          <div>
            <div style={styles.title}>Настройки вкладки</div>

            <div style={styles.subtitle}>
              Настройка типа, полей и блоков представления
            </div>
          </div>

          <button type="button" style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div
          style={{
            ...styles.body,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <label style={styles.label}>Название вкладки</label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={styles.input}
            placeholder="Название вкладки"
          />

          <label style={styles.label}>Тип представления</label>

          <select
            value={type}
            onChange={(event) => handleTypeChange(event.target.value)}
            style={styles.select}
            disabled={isSystemView}
          >
            {VIEW_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          {type !== "composite" ? (
            <div style={styles.section}>
              <UniversalViewFieldsSelector
                fields={fields}
                selectedFieldIds={selectedFieldIds}
                onChange={setSelectedFieldIds}
              />
            </div>
          ) : (
            <div style={styles.section}>
              <div style={localStyles.compositeHeader}>
                <div style={localStyles.compositeTitle}>
                  Блоки составного представления
                </div>

                <button
                  type="button"
                  style={localStyles.addBlockButton}
                  onClick={handleAddBlock}
                >
                  + Добавить
                </button>
              </div>

              <div style={localStyles.blocksList}>
                {blocks.map((block) => (
                  <CompositeBlockEditor
                    key={block.id}
                    block={block}
                    fields={fields}
                    collapsed={Boolean(collapsedBlockIds[block.id])}
                    onToggleCollapse={() => handleBlockCollapseToggle(block.id)}
                    onChange={(nextBlock) =>
                      handleBlockChange(block.id, nextBlock)
                    }
                    onDelete={() => handleBlockDelete(block.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          {!isSystemView && (
            <button
              type="button"
              style={styles.deleteButton}
              onClick={() => onDelete?.(view.id)}
            >
              Удалить
            </button>
          )}

          <div style={styles.footerRight}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Отмена
            </button>

            <button type="button" style={styles.saveButton} onClick={handleSave}>
              Сохранить
            </button>
          </div>
        </div>

        <div
          style={resizeStyles.left}
          onMouseDown={(event) => startResize(event, "left")}
        />
        <div
          style={resizeStyles.right}
          onMouseDown={(event) => startResize(event, "right")}
        />
        <div
          style={resizeStyles.top}
          onMouseDown={(event) => startResize(event, "top")}
        />
        <div
          style={resizeStyles.bottom}
          onMouseDown={(event) => startResize(event, "bottom")}
        />
        <div
          style={resizeStyles.topLeft}
          onMouseDown={(event) => startResize(event, "top-left")}
        />
        <div
          style={resizeStyles.topRight}
          onMouseDown={(event) => startResize(event, "top-right")}
        />
        <div
          style={resizeStyles.bottomLeft}
          onMouseDown={(event) => startResize(event, "bottom-left")}
        />
        <div
          style={resizeStyles.bottomRight}
          onMouseDown={(event) => startResize(event, "bottom-right")}
        />
      </div>
    </div>,
    document.body
  );
}

const localStyles = {
  compositeHeader: {
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  compositeTitle: {
    minWidth: 0,
    color: "#111827",
    fontSize: 12,
    fontWeight: 800,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  addBlockButton: {
    height: 30,
    padding: "0 12px",
    border: "1px solid #2563EB",
    borderRadius: 9,
    background: "#EFF6FF",
    color: "#2563EB",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  blocksList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  blockCard: {
    padding: 12,
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    background: "#FFFFFF",
    boxSizing: "border-box",
  },

  blockHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  blockCollapseButton: {
    width: 26,
    height: 26,
    border: "1px solid #D7DFEA",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#475569",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  blockHeaderText: {
    minWidth: 0,
    flex: 1,
  },

  blockTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: 800,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  blockMeta: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 11,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  blockDeleteButton: {
    border: "none",
    background: "transparent",
    color: "#EF4444",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  blockBody: {
    marginTop: 12,
  },

  blockGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    width: "100%",
  },

  fieldGroup: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  fieldLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: 700,
  },

  fieldInput: {
    width: "100%",
    height: 36,
    padding: "0 10px",
    border: "1px solid #CBD5E1",
    borderRadius: 9,
    background: "#FFFFFF",
    color: "#111827",
    fontSize: 13,
    fontWeight: 500,
    outline: "none",
    boxSizing: "border-box",
  },

  fieldsTitle: {
    marginTop: 14,
    marginBottom: 8,
    color: "#111827",
    fontSize: 13,
    fontWeight: 800,
  },
};

const resizeStyles = {
  left: {
    position: "absolute",
    top: 0,
    left: -4,
    width: 8,
    height: "100%",
    cursor: "col-resize",
    zIndex: 50,
  },

  right: {
    position: "absolute",
    top: 0,
    right: -4,
    width: 8,
    height: "100%",
    cursor: "col-resize",
    zIndex: 50,
  },

  top: {
    position: "absolute",
    top: -4,
    left: 0,
    width: "100%",
    height: 8,
    cursor: "row-resize",
    zIndex: 50,
  },

  bottom: {
    position: "absolute",
    left: 0,
    bottom: -4,
    width: "100%",
    height: 8,
    cursor: "row-resize",
    zIndex: 50,
  },

  topLeft: {
    position: "absolute",
    top: -5,
    left: -5,
    width: 12,
    height: 12,
    cursor: "nwse-resize",
    zIndex: 60,
  },

  topRight: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 12,
    height: 12,
    cursor: "nesw-resize",
    zIndex: 60,
  },

  bottomLeft: {
    position: "absolute",
    left: -5,
    bottom: -5,
    width: 12,
    height: 12,
    cursor: "nesw-resize",
    zIndex: 60,
  },

  bottomRight: {
    position: "absolute",
    right: -5,
    bottom: -5,
    width: 12,
    height: 12,
    cursor: "nwse-resize",
    zIndex: 60,
  },
};