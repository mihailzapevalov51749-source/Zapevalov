import { useCallback, useEffect, useRef, useState } from "react";

import {
  PLAN_TREE_PANEL_MAX_WIDTH,
  PLAN_TREE_PANEL_MIN_WIDTH,
  readPlanTreePanelWidth,
  writePlanTreePanelWidth,
} from "./planTreePanelWidthStorage.js";

/**
 * @param {string} [scopeKey]
 * @param {number|string|null|undefined} [tenantId]
 */
export default function usePlanTreePanelResize(scopeKey = "default", tenantId) {
  const [treePanelWidth, setTreePanelWidth] = useState(() =>
    readPlanTreePanelWidth(scopeKey, tenantId),
  );

  useEffect(() => {
    setTreePanelWidth(readPlanTreePanelWidth(scopeKey, tenantId));
  }, [scopeKey, tenantId]);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(treePanelWidth);

  const handleResizeStart = useCallback(
    (event) => {
      event.preventDefault();
      resizingRef.current = true;
      startXRef.current = event.clientX;
      startWidthRef.current = treePanelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [treePanelWidth],
  );

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!resizingRef.current) {
        return;
      }

      const delta = event.clientX - startXRef.current;
      const nextWidth = Math.min(
        PLAN_TREE_PANEL_MAX_WIDTH,
        Math.max(PLAN_TREE_PANEL_MIN_WIDTH, startWidthRef.current + delta),
      );

      setTreePanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (!resizingRef.current) {
        return;
      }

      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setTreePanelWidth((current) => {
        writePlanTreePanelWidth(current, scopeKey, tenantId);
        return current;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [scopeKey, tenantId]);

  return {
    treePanelWidth,
    handleResizeStart,
  };
}
