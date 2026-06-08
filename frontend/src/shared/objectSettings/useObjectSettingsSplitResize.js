import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  clampSplitLeftWidth,
  DEFAULT_MIN_LEFT_WIDTH_PX,
  DEFAULT_MIN_RIGHT_WIDTH_PX,
  getObjectSettingsLayout,
  saveObjectSettingsLayout,
} from "./objectSettingsStorage";

export default function useObjectSettingsSplitResize({
  storageKey,
  defaultLeftWidth,
  minLeftWidth = DEFAULT_MIN_LEFT_WIDTH_PX,
  minRightWidth = DEFAULT_MIN_RIGHT_WIDTH_PX,
} = {}) {
  const workspaceRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const leftWidthRef = useRef(null);

  const layoutOptions = useMemo(
    () => ({
      defaultLeftWidth,
      minLeftWidth,
      minRightWidth,
    }),
    [defaultLeftWidth, minLeftWidth, minRightWidth],
  );

  const syncLeftWidth = useCallback((nextWidth) => {
    leftWidthRef.current = nextWidth;
    setLeftWidth(nextWidth);
  }, []);

  const measureAndSyncWidth = useCallback(
    (options = {}) => {
      const workspace = workspaceRef.current;

      if (!workspace) {
        return;
      }

      const containerWidth = workspace.getBoundingClientRect().width;

      if (containerWidth <= 0) {
        return;
      }

      if (options.initialize) {
        syncLeftWidth(
          getObjectSettingsLayout(storageKey, containerWidth, layoutOptions),
        );
        return;
      }

      if (leftWidthRef.current === null) {
        return;
      }

      syncLeftWidth(
        clampSplitLeftWidth(leftWidthRef.current, containerWidth, layoutOptions),
      );
    },
    [layoutOptions, storageKey, syncLeftWidth],
  );

  useEffect(() => {
    measureAndSyncWidth({ initialize: true });
  }, [measureAndSyncWidth, storageKey]);

  useEffect(() => {
    const workspace = workspaceRef.current;

    if (!workspace || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      measureAndSyncWidth();
    });

    observer.observe(workspace);

    return () => {
      observer.disconnect();
    };
  }, [measureAndSyncWidth]);

  const handleResizePointerDown = useCallback((event) => {
    event.preventDefault();

    const handle = event.currentTarget;

    if (typeof handle.setPointerCapture === "function") {
      handle.setPointerCapture(event.pointerId);
    }

    setIsDragging(true);
  }, []);

  const handleResizePointerMove = useCallback(
    (event) => {
      if (!isDragging) {
        return;
      }

      const workspace = workspaceRef.current;

      if (!workspace) {
        return;
      }

      const rect = workspace.getBoundingClientRect();
      const nextLeft = clampSplitLeftWidth(
        event.clientX - rect.left,
        rect.width,
        layoutOptions,
      );

      syncLeftWidth(nextLeft);
    },
    [isDragging, layoutOptions, syncLeftWidth],
  );

  const finishResize = useCallback(() => {
    if (!isDragging) {
      return;
    }

    setIsDragging(false);

    if (leftWidthRef.current !== null) {
      saveObjectSettingsLayout(storageKey, leftWidthRef.current);
    }
  }, [isDragging, storageKey]);

  const handleResizePointerUp = useCallback(
    (event) => {
      if (typeof event.currentTarget.releasePointerCapture === "function") {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // Pointer may already be released.
        }
      }

      finishResize();
    },
    [finishResize],
  );

  const handleResizeLostPointerCapture = useCallback(() => {
    finishResize();
  }, [finishResize]);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [isDragging]);

  return {
    workspaceRef,
    leftWidth,
    isDragging,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    handleResizeLostPointerCapture,
  };
}
