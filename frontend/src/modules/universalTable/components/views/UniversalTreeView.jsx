import { useEffect, useMemo, useRef, useState } from "react";

const MIN_TREE_WIDTH = 280;
const MAX_TREE_WIDTH = 1800;
const DEFAULT_TREE_WIDTH = 360;

const MIN_TREE_HEIGHT = 320;
const MAX_TREE_HEIGHT = 1400;
const DEFAULT_TREE_HEIGHT = 520;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getParentId(row) {
  return (
    row?.parent_id ||
    row?.parentId ||
    row?.parent_row_id ||
    row?.parentRowId ||
    row?.values?.parent_id ||
    row?.values?.parentId ||
    null
  );
}

function getPrimaryColumn(columns = []) {
  return (
    columns.find(
      (column) =>
        column?.system_key === "title" ||
        column?.systemKey === "title"
    ) ||
    columns.find(
      (column) =>
        column?.is_primary === true ||
        column?.isPrimary === true
    ) ||
    columns[0] ||
    null
  );
}

function getRowTitle(row, titleColumn) {
  if (!row) return "Без названия";

  const values = row?.values || {};
  const titleColumnId = titleColumn?.id ? String(titleColumn.id) : null;

  if (
    titleColumnId &&
    values[titleColumnId] !== undefined &&
    values[titleColumnId] !== null &&
    String(values[titleColumnId]).trim()
  ) {
    return String(values[titleColumnId]);
  }

  return (
    row?.title ||
    row?.name ||
    values?.title ||
    values?.name ||
    `Строка ${row?.number || row?.id || ""}`
  );
}

function buildTree(rows = []) {
  const map = new Map();
  const roots = [];

  rows.forEach((row) => {
    map.set(String(row.id), {
      row,
      children: [],
    });
  });

  rows.forEach((row) => {
    const parentId = getParentId(row);

    if (parentId && map.has(String(parentId))) {
      map.get(String(parentId)).children.push(map.get(String(row.id)));
      return;
    }

    roots.push(map.get(String(row.id)));
  });

  return roots;
}

function filterTree(nodes = [], searchValue = "", titleColumn) {
  const query = String(searchValue || "").trim().toLowerCase();

  if (!query) return nodes;

  return nodes
    .map((node) => {
      const title = getRowTitle(node.row, titleColumn).toLowerCase();

      const filteredChildren = filterTree(
        node.children,
        searchValue,
        titleColumn
      );

      if (title.includes(query) || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    })
    .filter(Boolean);
}

function TreeNode({
  node,
  level = 0,
  expandedIds,
  selectedRowId,
  onToggle,
  onRowOpen,
  onSelectRow,
  titleColumn,
}) {
  const row = node.row;

  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(String(row.id));
  const isSelected = String(selectedRowId || "") === String(row.id);

  function handleNodeClick() {
    onSelectRow?.(row);
    onRowOpen?.(row);
  }

  return (
    <div style={styles.nodeOuter}>
      <div
        style={{
          ...styles.node,
          ...(isSelected ? styles.nodeSelected : {}),
          paddingLeft: 12 + level * 22,
        }}
        onClick={handleNodeClick}
      >
        <button
          type="button"
          style={styles.expandButton}
          onClick={(event) => {
            event.stopPropagation();

            if (hasChildren) {
              onToggle(row.id);
            }
          }}
        >
          {hasChildren ? (isExpanded ? "⌄" : "›") : ""}
        </button>

        <div style={styles.iconBox}>{hasChildren ? "▣" : "♙"}</div>

        <div style={styles.nodeTitle}>{getRowTitle(row, titleColumn)}</div>
      </div>

      {hasChildren && isExpanded && (
        <div style={styles.children}>
          {node.children.map((child) => (
            <TreeNode
              key={child.row.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              selectedRowId={selectedRowId}
              onToggle={onToggle}
              onRowOpen={onRowOpen}
              onSelectRow={onSelectRow}
              titleColumn={titleColumn}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function UniversalTreeView({
  rows = [],
  columns = [],
  onRowOpen,
  embedded = false,

  view,
  settings = {},
  onViewSettingsSave,
}) {
  const settingsRef = useRef(settings);
  const sizeRef = useRef({
    width: DEFAULT_TREE_WIDTH,
    height: DEFAULT_TREE_HEIGHT,
  });

  const layout = settings?.layout || {};

  const [treeWidth, setTreeWidth] = useState(() =>
    clamp(
      Number(layout.width) || DEFAULT_TREE_WIDTH,
      MIN_TREE_WIDTH,
      MAX_TREE_WIDTH
    )
  );

  const [treeHeight, setTreeHeight] = useState(() =>
    clamp(
      Number(layout.height) || DEFAULT_TREE_HEIGHT,
      MIN_TREE_HEIGHT,
      MAX_TREE_HEIGHT
    )
  );

  const [searchValue, setSearchValue] = useState("");
  const [selectedRowId, setSelectedRowId] = useState(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    sizeRef.current = {
      width: treeWidth,
      height: treeHeight,
    };
  }, [treeWidth, treeHeight]);

  useEffect(() => {
    if (embedded) return;

    const nextWidth = clamp(
      Number(settings?.layout?.width) || DEFAULT_TREE_WIDTH,
      MIN_TREE_WIDTH,
      MAX_TREE_WIDTH
    );

    const nextHeight = clamp(
      Number(settings?.layout?.height) || DEFAULT_TREE_HEIGHT,
      MIN_TREE_HEIGHT,
      MAX_TREE_HEIGHT
    );

    setTreeWidth(nextWidth);
    setTreeHeight(nextHeight);
  }, [embedded, settings?.layout?.width, settings?.layout?.height]);

  const tree = useMemo(() => buildTree(rows), [rows]);

  const titleColumn = useMemo(() => getPrimaryColumn(columns), [columns]);

  const filteredTree = useMemo(
    () => filterTree(tree, searchValue, titleColumn),
    [tree, searchValue, titleColumn]
  );

  const [expandedIds, setExpandedIds] = useState(() => {
    return new Set(tree.map((node) => String(node.row.id)));
  });

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);

      tree.forEach((node) => {
        next.add(String(node.row.id));
      });

      return next;
    });
  }, [tree]);

  function saveLayout(nextWidth, nextHeight) {
    if (embedded) return;
    if (!view?.id || !onViewSettingsSave) return;

    const currentSettings = settingsRef.current || {};

    onViewSettingsSave(view.id, {
      type: view.type || "tree",
      settings: {
        ...currentSettings,

        layout: {
          ...(currentSettings?.layout || {}),

          width: clamp(nextWidth, MIN_TREE_WIDTH, MAX_TREE_WIDTH),
          height: clamp(nextHeight, MIN_TREE_HEIGHT, MAX_TREE_HEIGHT),
        },
      },
    });
  }

  function handleToggle(rowId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const id = String(rowId);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function handleResizeStart(event, direction) {
    if (embedded) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;

    const startWidth = sizeRef.current.width;
    const startHeight = sizeRef.current.height;

    let nextWidth = startWidth;
    let nextHeight = startHeight;

    const isHorizontal = direction === "left" || direction === "right";
    const cursor = isHorizontal ? "col-resize" : "row-resize";

    function handleMouseMove(moveEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (direction === "right") {
        nextWidth = clamp(
          startWidth + deltaX,
          MIN_TREE_WIDTH,
          MAX_TREE_WIDTH
        );

        setTreeWidth(nextWidth);
      }

      if (direction === "left") {
        nextWidth = clamp(
          startWidth - deltaX,
          MIN_TREE_WIDTH,
          MAX_TREE_WIDTH
        );

        setTreeWidth(nextWidth);
      }

      if (direction === "bottom") {
        nextHeight = clamp(
          startHeight + deltaY,
          MIN_TREE_HEIGHT,
          MAX_TREE_HEIGHT
        );

        setTreeHeight(nextHeight);
      }

      if (direction === "top") {
        nextHeight = clamp(
          startHeight - deltaY,
          MIN_TREE_HEIGHT,
          MAX_TREE_HEIGHT
        );

        setTreeHeight(nextHeight);
      }

      sizeRef.current = {
        width: nextWidth,
        height: nextHeight,
      };
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      saveLayout(sizeRef.current.width, sizeRef.current.height);
    }

    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <div
      style={{
        ...styles.wrapper,
        ...(embedded
          ? styles.wrapperEmbedded
          : {
              width: treeWidth,
              height: treeHeight,
            }),
      }}
    >
      <div style={styles.treePanel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelTitle}>Дерево компании</div>

          <div style={styles.headerActions}>
            <button type="button" style={styles.iconButton}>
              ≡
            </button>

            <button type="button" style={styles.iconButton}>
              ⊞
            </button>
          </div>
        </div>

        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>⌕</span>

          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Поиск по структуре"
            style={styles.searchInput}
          />
        </div>

        <div style={styles.treeBody}>
          {!filteredTree.length ? (
            <div style={styles.empty}>Нет строк для построения дерева.</div>
          ) : (
            filteredTree.map((node) => (
              <TreeNode
                key={node.row.id}
                node={node}
                expandedIds={expandedIds}
                selectedRowId={selectedRowId}
                onToggle={handleToggle}
                onRowOpen={onRowOpen}
                onSelectRow={(row) => setSelectedRowId(row.id)}
                titleColumn={titleColumn}
              />
            ))
          )}
        </div>
      </div>

      {!embedded && (
        <>
          <div
            style={styles.resizeHandleLeft}
            onMouseDown={(event) => handleResizeStart(event, "left")}
            title="Изменить ширину"
          />

          <div
            style={styles.resizeHandleRight}
            onMouseDown={(event) => handleResizeStart(event, "right")}
            title="Изменить ширину"
          />

          <div
            style={styles.resizeHandleTop}
            onMouseDown={(event) => handleResizeStart(event, "top")}
            title="Изменить высоту"
          />

          <div
            style={styles.resizeHandleBottom}
            onMouseDown={(event) => handleResizeStart(event, "bottom")}
            title="Изменить высоту"
          />
        </>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    minWidth: MIN_TREE_WIDTH,
    minHeight: MIN_TREE_HEIGHT,

    position: "relative",

    background: "#FFFFFF",

    boxSizing: "border-box",

    overflow: "hidden",
  },

  wrapperEmbedded: {
    width: "100%",
    height: "100%",

    minWidth: 0,
    minHeight: 0,
  },

  treePanel: {
    width: "100%",
    height: "100%",

    padding: "18px 14px 16px",

    background: "#FFFFFF",

    boxSizing: "border-box",

    overflow: "hidden",
  },

  panelHeader: {
    height: 34,

    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 12,
  },

  panelTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  iconButton: {
    width: 30,
    height: 30,

    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    border: "1px solid #E5E7EB",
    borderRadius: 8,

    background: "#FFFFFF",

    color: "#475569",

    fontSize: 14,
    fontWeight: 700,

    cursor: "pointer",
  },

  searchBox: {
    height: 34,

    display: "flex",
    alignItems: "center",

    gap: 8,

    padding: "0 10px",

    marginBottom: 12,

    border: "1px solid #E5E7EB",
    borderRadius: 8,

    background: "#FFFFFF",

    boxSizing: "border-box",
  },

  searchIcon: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 1,
  },

  searchInput: {
    width: "100%",
    height: "100%",

    border: "none",
    outline: "none",

    background: "transparent",

    color: "#111827",

    fontSize: 13,
  },

  treeBody: {
    height: "calc(100% - 80px)",

    overflowY: "auto",
    overflowX: "hidden",

    paddingRight: 4,
  },

  nodeOuter: {
    position: "relative",
  },

  children: {
    position: "relative",

    marginLeft: 20,

    borderLeft: "1px dashed #E2E8F0",
  },

  node: {
    minHeight: 30,

    display: "flex",
    alignItems: "center",

    gap: 6,

    paddingRight: 8,

    borderRadius: 7,

    cursor: "pointer",

    color: "#111827",

    boxSizing: "border-box",

    transition: "background 0.15s ease",
  },

  nodeSelected: {
    background: "#EEF2FF",
  },

  expandButton: {
    width: 16,
    height: 24,

    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    border: "none",
    borderRadius: 4,

    background: "transparent",

    color: "#475569",

    fontSize: 15,
    fontWeight: 700,

    cursor: "pointer",

    flexShrink: 0,
  },

  iconBox: {
    width: 18,
    height: 18,

    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    color: "#2563EB",

    fontSize: 13,
    lineHeight: 1,

    flexShrink: 0,
  },

  nodeTitle: {
    minWidth: 0,

    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",

    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
  },

  resizeHandleLeft: {
    position: "absolute",

    top: 0,
    left: -3,

    width: 6,
    height: "100%",

    cursor: "col-resize",

    background: "transparent",
    zIndex: 5,
  },

  resizeHandleRight: {
    position: "absolute",

    top: 0,
    right: -3,

    width: 6,
    height: "100%",

    cursor: "col-resize",

    background: "transparent",
    zIndex: 5,
  },

  resizeHandleTop: {
    position: "absolute",

    top: -3,
    left: 0,
    right: 0,

    height: 6,

    cursor: "row-resize",

    background: "transparent",
    zIndex: 5,
  },

  resizeHandleBottom: {
    position: "absolute",

    left: 0,
    right: 0,
    bottom: -3,

    height: 6,

    cursor: "row-resize",

    background: "transparent",
    zIndex: 5,
  },

  empty: {
    margin: 8,
    padding: 12,

    border: "1px dashed #CBD5E1",
    borderRadius: 10,

    background: "#F8FAFC",

    fontSize: 13,
    color: "#64748B",
  },
};