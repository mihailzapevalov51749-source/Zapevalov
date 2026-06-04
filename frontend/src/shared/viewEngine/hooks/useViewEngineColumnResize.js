import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
} from "../viewEngineStyles";

function columnWidthChanged(previousWidth, nextWidth) {
  const previous = Number(previousWidth);
  const next = Number(nextWidth);

  if (!Number.isFinite(next) || next <= 0) {
    return false;
  }

  if (!Number.isFinite(previous) || previous <= 0) {
    return true;
  }

  return Math.abs(previous - next) >= 0.5;
}

/**
 * Column width state — local (default) or controlled via props.
 * Controlled: live drag uses transient overrides; parent/session updates on pointer up.
 */
export default function useViewEngineColumnResize(
  columns = [],
  {
    columnWidths = null,
    onColumnResize = null,
    onColumnResizeEnd = null,
  } = {},
) {
  const isControlled = typeof onColumnResize === "function";

  const [widthOverrides, setWidthOverrides] = useState({});
  const [liveDragWidths, setLiveDragWidths] = useState({});
  const [pendingCommitWidths, setPendingCommitWidths] = useState({});
  const [resizeState, setResizeState] = useState(null);
  const isResizingRef = useRef(false);
  const lastLiveWidthRef = useRef(null);

  const persistedOverrides = isControlled ? columnWidths || {} : widthOverrides;

  const effectiveOverrides = useMemo(() => {
    const merged = {
      ...persistedOverrides,
      ...pendingCommitWidths,
    };

    if (resizeState && Object.keys(liveDragWidths).length > 0) {
      return {
        ...merged,
        ...liveDragWidths,
      };
    }

    return merged;
  }, [
    persistedOverrides,
    pendingCommitWidths,
    liveDragWidths,
    resizeState,
  ]);

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    setPendingCommitWidths((prev) => {
      if (!Object.keys(prev).length) {
        return prev;
      }

      const next = { ...prev };
      let changed = false;

      for (const [key, width] of Object.entries(prev)) {
        const persisted = Number(persistedOverrides[key]);
        const pending = Number(width);

        if (
          Number.isFinite(persisted) &&
          Number.isFinite(pending) &&
          Math.abs(persisted - pending) < 0.5
        ) {
          delete next[key];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [persistedOverrides, isControlled]);

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

  const applyLiveDragWidth = useCallback((columnKey, nextWidth) => {
    if (!columnKey) {
      return;
    }

    if (!columnWidthChanged(lastLiveWidthRef.current, nextWidth)) {
      return;
    }

    lastLiveWidthRef.current = nextWidth;

    setLiveDragWidths((prev) => {
      const previous = prev[columnKey];

      if (!columnWidthChanged(previous, nextWidth)) {
        return prev;
      }

      return {
        ...prev,
        [columnKey]: nextWidth,
      };
    });
  }, []);

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
        applyLiveDragWidth(resizeState.columnKey, nextWidth);
      } else {
        setWidthOverrides((prev) => {
          const previous = prev[resizeState.columnKey];

          if (!columnWidthChanged(previous, nextWidth)) {
            return prev;
          }

          return {
            ...prev,
            [resizeState.columnKey]: nextWidth,
          };
        });
      }
    };

    const handleMouseUp = (event) => {
      const delta = event.clientX - resizeState.startX;
      const finalWidth = Math.min(
        MAX_COLUMN_WIDTH,
        Math.max(
          MIN_COLUMN_WIDTH,
          resizeState.startWidth + delta,
        ),
      );
      const columnKey = resizeState.columnKey;
      const startWidth = resizeState.startWidth;
      const didChange = columnWidthChanged(startWidth, finalWidth);

      if (isControlled) {
        if (didChange) {
          setPendingCommitWidths((prev) => {
            const previous = prev[columnKey];

            if (!columnWidthChanged(previous, finalWidth)) {
              return prev;
            }

            return {
              ...prev,
              [columnKey]: finalWidth,
            };
          });
          onColumnResize?.(columnKey, finalWidth);
        }

        setResizeState(null);
        setLiveDragWidths({});
        lastLiveWidthRef.current = null;
        onColumnResizeEnd?.(columnKey, finalWidth);
      } else if (didChange) {
        setWidthOverrides((prev) => ({
          ...prev,
          [columnKey]: finalWidth,
        }));
        setResizeState(null);
        setLiveDragWidths({});
        lastLiveWidthRef.current = null;
        onColumnResizeEnd?.(columnKey, finalWidth);
      } else {
        setResizeState(null);
        setLiveDragWidths({});
        lastLiveWidthRef.current = null;
        onColumnResizeEnd?.(columnKey, finalWidth);
      }

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
  }, [
    resizeState,
    isControlled,
    onColumnResize,
    onColumnResizeEnd,
    applyLiveDragWidth,
  ]);

  const handleResizeMouseDown = useCallback(
    (event, column) => {
      event.preventDefault();
      event.stopPropagation();

      isResizingRef.current = true;
      lastLiveWidthRef.current = null;

      const columnKey = String(column?.key || "");
      const startWidth = getColumnWidth(column);

      setLiveDragWidths({});
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
