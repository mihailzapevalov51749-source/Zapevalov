import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
} from "../viewEngineStyles";

/**
 * Column width state — local (default) or controlled via props.
 */
export default function useViewEngineColumnResize(
  columns = [],
  { columnWidths = null, onColumnResize = null } = {},
) {
  const isControlled =
    columnWidths != null && typeof onColumnResize === "function";

  const [widthOverrides, setWidthOverrides] = useState({});
  const [resizeState, setResizeState] = useState(null);
  const isResizingRef = useRef(false);

  const effectiveOverrides = isControlled ? columnWidths : widthOverrides;

  const getColumnWidth = useCallback(
    (column) => {
      const key = String(column?.key || "");

      if (key && effectiveOverrides[key] != null) {
        return effectiveOverrides[key];
      }

      const width = Number(column?.width);

      if (Number.isFinite(width) && width > 0) {
        return width;
      }

      return DEFAULT_COLUMN_WIDTH;
    },
    [effectiveOverrides],
  );

  useEffect(() => {
    if (!resizeState) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      const delta = event.clientX - resizeState.startX;
      const nextWidth = Math.min(
        MAX_COLUMN_WIDTH,
        Math.max(MIN_COLUMN_WIDTH, resizeState.startWidth + delta),
      );

      if (isControlled) {
        onColumnResize(resizeState.columnKey, nextWidth);
      } else {
        setWidthOverrides((prev) => ({
          ...prev,
          [resizeState.columnKey]: nextWidth,
        }));
      }
    };

    const handleMouseUp = () => {
      setResizeState(null);

      setTimeout(() => {
        isResizingRef.current = false;
      }, 0);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeState, isControlled, onColumnResize]);

  const handleResizeMouseDown = useCallback(
    (event, column) => {
      event.preventDefault();
      event.stopPropagation();

      isResizingRef.current = true;

      const columnKey = String(column?.key || "");
      const startWidth = getColumnWidth(column);

      setResizeState({
        columnKey,
        startWidth,
        startX: event.clientX,
      });
    },
    [getColumnWidth],
  );

  useEffect(() => {
    const validKeys = new Set(
      columns.map((column) => String(column?.key || "")).filter(Boolean),
    );

    if (isControlled) {
      return;
    }

    setWidthOverrides((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const key of Object.keys(next)) {
        if (!validKeys.has(key)) {
          delete next[key];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [columns, isControlled]);

  return {
    getColumnWidth,
    handleResizeMouseDown,
    isResizing: Boolean(resizeState),
    isResizingRef,
    isControlled,
  };
}
