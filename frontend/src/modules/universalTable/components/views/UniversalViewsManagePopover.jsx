import { useEffect, useRef, useState } from "react";

import settingsIcon from "../../../../assets/icons/settings.gif";

import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";

const DEFAULT_WIDTH = 280;
const DEFAULT_HEIGHT = 360;

const MIN_WIDTH = 240;
const MAX_WIDTH = 620;

const MIN_HEIGHT = 180;
const MAX_HEIGHT = 720;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getInitialLayout({ top, left, savedLayout }) {
  return {
    top: Number(savedLayout?.top) || Number(top) || 260,

    left: Number(savedLayout?.left) || Number(left) || 260,

    width: clamp(
      Number(savedLayout?.width) || DEFAULT_WIDTH,
      MIN_WIDTH,
      MAX_WIDTH
    ),

    height: clamp(
      Number(savedLayout?.height) || DEFAULT_HEIGHT,
      MIN_HEIGHT,
      MAX_HEIGHT
    ),
  };
}

export default function UniversalViewsManagePopover({
  top,
  left,
  savedLayout,

  views = [],
  activeViewId,
  defaultViewId,

  onSelectView,
  onDefaultViewChange,
  onLayoutSave,
  onViewVisibilityToggle,
  onViewSettingsToggle,
  onViewRename,
}) {
  const layoutRef = useRef(
    getInitialLayout({
      top,
      left,
      savedLayout,
    })
  );

  const [layout, setLayout] = useState(() =>
    getInitialLayout({
      top,
      left,
      savedLayout,
    })
  );

  const [renameViewId, setRenameViewId] =
    useState(null);

  const [renameValue, setRenameValue] =
    useState("");

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    setLayout(
      getInitialLayout({
        top,
        left,
        savedLayout,
      })
    );
  }, [top, left, savedLayout]);

  useEffect(() => {
    if (!renameViewId) return;

    const exists = views.some(
      (view) =>
        String(view.id) ===
        String(renameViewId)
    );

    if (!exists) {
      setRenameViewId(null);
      setRenameValue("");
    }
  }, [views, renameViewId]);

  function saveCurrentLayout() {
    const currentLayout = layoutRef.current;

    onLayoutSave?.({
      top: currentLayout.top,
      left: currentLayout.left,
      width: currentLayout.width,
      height: currentLayout.height,
    });
  }

  function startRename(view) {
    setRenameViewId(view.id);

    setRenameValue(
      view.name || "Представление"
    );
  }

  function cancelRename() {
    setRenameViewId(null);
    setRenameValue("");
  }

  function submitRename(view) {
    const nextName =
      renameValue.trim();

    if (!nextName) {
      cancelRename();
      return;
    }

    if (
      nextName !==
      (view.name || "")
    ) {
      onViewRename?.(
        view.id,
        nextName
      );
    }

    setRenameViewId(null);
    setRenameValue("");
  }

  function handleDragStart(event) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;

    const startLayout =
      layoutRef.current;

    function handleMouseMove(
      moveEvent
    ) {
      const deltaX =
        moveEvent.clientX - startX;

      const deltaY =
        moveEvent.clientY - startY;

      const viewportWidth =
        window.innerWidth ||
        document.documentElement
          .clientWidth;

      const viewportHeight =
        window.innerHeight ||
        document.documentElement
          .clientHeight;

      const nextLeft = clamp(
        startLayout.left + deltaX,
        8,
        viewportWidth -
          startLayout.width -
          8
      );

      const nextTop = clamp(
        startLayout.top + deltaY,
        8,
        viewportHeight -
          startLayout.height -
          8
      );

      const nextLayout = {
        ...startLayout,
        left: nextLeft,
        top: nextTop,
      };

      layoutRef.current = nextLayout;

      setLayout(nextLayout);
    }

    function handleMouseUp() {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );

      document.body.style.cursor =
        "";

      document.body.style.userSelect =
        "";

      saveCurrentLayout();
    }

    document.body.style.cursor =
      "move";

    document.body.style.userSelect =
      "none";

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );
  }

  function handleResizeStart(
    event,
    direction
  ) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;

    const startLayout =
      layoutRef.current;

    function handleMouseMove(
      moveEvent
    ) {
      const deltaX =
        moveEvent.clientX - startX;

      const deltaY =
        moveEvent.clientY - startY;

      let nextTop =
        startLayout.top;

      let nextLeft =
        startLayout.left;

      let nextWidth =
        startLayout.width;

      let nextHeight =
        startLayout.height;

      if (
        direction.includes("right")
      ) {
        nextWidth = clamp(
          startLayout.width + deltaX,
          MIN_WIDTH,
          MAX_WIDTH
        );
      }

      if (
        direction.includes("left")
      ) {
        nextWidth = clamp(
          startLayout.width - deltaX,
          MIN_WIDTH,
          MAX_WIDTH
        );

        nextLeft =
          startLayout.left +
          (startLayout.width -
            nextWidth);
      }

      if (
        direction.includes("bottom")
      ) {
        nextHeight = clamp(
          startLayout.height + deltaY,
          MIN_HEIGHT,
          MAX_HEIGHT
        );
      }

      if (
        direction.includes("top")
      ) {
        nextHeight = clamp(
          startLayout.height - deltaY,
          MIN_HEIGHT,
          MAX_HEIGHT
        );

        nextTop =
          startLayout.top +
          (startLayout.height -
            nextHeight);
      }

      const nextLayout = {
        top: nextTop,
        left: nextLeft,
        width: nextWidth,
        height: nextHeight,
      };

      layoutRef.current = nextLayout;

      setLayout(nextLayout);
    }

    function handleMouseUp() {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );

      document.body.style.cursor =
        "";

      document.body.style.userSelect =
        "";

      saveCurrentLayout();
    }

    document.body.style.cursor =
      direction === "left" ||
      direction === "right"
        ? "col-resize"
        : direction === "top" ||
          direction === "bottom"
        ? "row-resize"
        : "nwse-resize";

    document.body.style.userSelect =
      "none";

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );
  }

  return (
    <div
      style={{
        ...styles.popover,
        top: layout.top,
        left: layout.left,
        width: layout.width,
        height: layout.height,
      }}
      onMouseDown={(event) =>
        event.stopPropagation()
      }
      onClick={(event) =>
        event.stopPropagation()
      }
      onPointerDown={(event) =>
        event.stopPropagation()
      }
    >
      <div
        style={styles.header}
        onMouseDown={handleDragStart}
      >
        <div style={styles.headerTitle}>
          Управление вкладками
        </div>
      </div>

      <div style={styles.content}>
        {views.length === 0 ? (
          <div style={styles.empty}>
            Вкладок пока нет
          </div>
        ) : (
          views.map((view) => {
            const viewId = String(
              view.id
            );

            const isActive =
              String(activeViewId) ===
              viewId;

            const isDefault =
              String(defaultViewId || "") ===
              viewId;

            const isVisible =
              view.hidden !== true &&
              view.isVisible !== false &&
              view.is_visible !== false;

            const isRenaming =
              String(renameViewId || "") ===
              viewId;

            return (
              <div
                key={viewId}
                style={{
                  ...styles.row,
                  background: isActive
                    ? "#F8FBFF"
                    : "#FFFFFF",

                  opacity: isVisible
                    ? 1
                    : 0.65,
                }}
              >
                <button
                  type="button"
                  style={{
                    ...styles.defaultButton,
                    color: isDefault
                      ? "#F59E0B"
                      : "#CBD5E1",
                  }}
                  title={
                    isDefault
                      ? "Вкладка по умолчанию"
                      : "Сделать вкладкой по умолчанию"
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    onDefaultViewChange?.(
                      view.id
                    );
                  }}
                >
                  {isDefault ? "★" : "☆"}
                </button>

                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(event) =>
                      setRenameValue(
                        event.target.value
                      )
                    }
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                    onMouseDown={(event) =>
                      event.stopPropagation()
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter"
                      ) {
                        submitRename(view);
                      }

                      if (
                        event.key === "Escape"
                      ) {
                        cancelRename();
                      }
                    }}
                    onBlur={() =>
                      submitRename(view)
                    }
                    style={styles.renameInput}
                  />
                ) : (
                  <div style={styles.nameWrap}>
                    <button
                      type="button"
                      disabled={!isVisible}
                      style={{
                        ...styles.nameButton,
                        color: isActive
                          ? "#2563EB"
                          : "#334155",

                        fontWeight: isActive
                          ? 700
                          : 600,

                        cursor: isVisible
                          ? "pointer"
                          : "not-allowed",
                      }}
                      title={
                        view.name ||
                        "Представление"
                      }
                      onClick={(event) => {
                        event.stopPropagation();

                        if (!isVisible)
                          return;

                        onSelectView?.(
                          view.id
                        );
                      }}
                    >
                      <span
                        style={styles.nameText}
                      >
                        {view.name ||
                          "Представление"}
                      </span>
                    </button>

                    <button
                      type="button"
                      style={{
                        ...styles.renameButton,
                        opacity: isVisible
                          ? 1
                          : 0.45,

                        cursor: isVisible
                          ? "pointer"
                          : "not-allowed",
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (!isVisible)
                          return;

                        startRename(view);
                      }}
                      title="Переименовать вкладку"
                    >
                      ✎
                    </button>
                  </div>
                )}

                <div style={styles.actions}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();

                      if (
                        isActive &&
                        isVisible
                      ) {
                        return;
                      }

                      onViewVisibilityToggle?.(
                        view.id,
                        !isVisible
                      );
                    }}
                    style={{
                      ...styles.iconButton,
                      opacity:
                        isActive &&
                        isVisible
                          ? 0.45
                          : 1,

                      cursor:
                        isActive &&
                        isVisible
                          ? "not-allowed"
                          : "pointer",
                    }}
                    title={
                      isActive &&
                      isVisible
                        ? "Активную вкладку нельзя скрыть"
                        : isVisible
                        ? "Скрыть вкладку"
                        : "Показать вкладку"
                    }
                  >
                    <img
                      src={
                        isVisible
                          ? eyeOpenIcon
                          : eyeClosedIcon
                      }
                      alt=""
                      draggable={false}
                      style={styles.icon}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();

                      onViewSettingsToggle?.(
                        view
                      );
                    }}
                    style={styles.iconButton}
                    title="Настроить вкладку"
                  >
                    <img
                      src={settingsIcon}
                      alt=""
                      draggable={false}
                      style={styles.icon}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={styles.resizeHandleLeft}
        onMouseDown={(event) =>
          handleResizeStart(
            event,
            "left"
          )
        }
      />

      <div
        style={styles.resizeHandleRight}
        onMouseDown={(event) =>
          handleResizeStart(
            event,
            "right"
          )
        }
      />

      <div
        style={styles.resizeHandleTop}
        onMouseDown={(event) =>
          handleResizeStart(
            event,
            "top"
          )
        }
      />

      <div
        style={styles.resizeHandleBottom}
        onMouseDown={(event) =>
          handleResizeStart(
            event,
            "bottom"
          )
        }
      />
    </div>
  );
}

const styles = {
  popover: {
    position: "fixed",
    zIndex: 999999,

    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,

    border: "1px solid #E2E8F0",
    borderRadius: 14,

    background: "#FFFFFF",

    boxShadow:
      "0 18px 36px rgba(15, 23, 42, 0.14)",

    overflow: "hidden",
    boxSizing: "border-box",
  },

  header: {
    height: 38,

    padding: "0 12px",

    display: "flex",
    alignItems: "center",

    borderBottom:
      "1px solid #EEF2F7",

    background: "#FFFFFF",

    cursor: "move",
    userSelect: "none",

    boxSizing: "border-box",
  },

  headerTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0F172A",
  },

  content: {
    height: "calc(100% - 38px)",

    padding: "5px 0",

    overflowY: "auto",
    overflowX: "hidden",

    boxSizing: "border-box",
  },

  empty: {
    padding: "12px 14px",

    fontSize: 13,
    fontWeight: 600,

    color: "#94A3B8",
  },

  row: {
    minHeight: 46,

    padding: "0 10px 0 8px",

    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",

    gap: 6,

    boxSizing: "border-box",
  },

  defaultButton: {
    width: 22,
    height: 30,

    padding: 0,

    border: "none",
    background: "transparent",

    fontSize: 16,
    lineHeight: "30px",

    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  nameWrap: {
    minWidth: 0,
    flex: 1,

    display: "flex",
    alignItems: "center",

    gap: 4,
  },

  nameButton: {
    minWidth: 0,
    flex: 1,

    padding: "6px 0",

    border: "none",
    background: "transparent",

    textAlign: "left",

    outline: "none",
  },

  nameText: {
    display: "block",

    maxWidth: "100%",

    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",

    fontSize: 13,
    lineHeight: "18px",
  },

  renameButton: {
    width: 18,
    height: 18,

    padding: 0,

    border: "none",
    background: "transparent",

    color: "#64748B",

    fontSize: 13,
    lineHeight: "18px",

    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  renameInput: {
    minWidth: 0,
    flex: 1,
    height: 30,

    padding: "0 8px",

    border: "1px solid #93C5FD",
    borderRadius: 8,

    background: "#FFFFFF",

    color: "#0F172A",

    fontSize: 13,
    fontWeight: 700,

    outline: "none",

    boxSizing: "border-box",
  },

  actions: {
    display: "flex",
    alignItems: "center",

    gap: 4,

    flexShrink: 0,
  },

  iconButton: {
    width: 30,
    height: 30,

    border: "1px solid #DBE3EF",
    borderRadius: 8,

    background: "#FFFFFF",

    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  icon: {
    width: 15,
    height: 15,

    display: "block",

    objectFit: "contain",

    pointerEvents: "none",
  },

  resizeHandleLeft: {
    position: "absolute",
    top: 0,
    left: -3,
    width: 6,
    height: "100%",
    cursor: "col-resize",
    background: "transparent",
    zIndex: 10,
  },

  resizeHandleRight: {
    position: "absolute",
    top: 0,
    right: -3,
    width: 6,
    height: "100%",
    cursor: "col-resize",
    background: "transparent",
    zIndex: 10,
  },

  resizeHandleTop: {
    position: "absolute",
    top: -3,
    left: 0,
    right: 0,
    height: 6,
    cursor: "row-resize",
    background: "transparent",
    zIndex: 10,
  },

  resizeHandleBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -3,
    height: 6,
    cursor: "row-resize",
    background: "transparent",
    zIndex: 10,
  },
};