import { useCallback, useEffect, useRef, useState } from "react";

const VIEWPORT_PADDING = 12;

function loadLayout(storageKey, defaults) {
  if (!storageKey) return defaults;

  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) return defaults;

    const parsed = JSON.parse(raw);

    return {
      top: Number(parsed.top) || defaults.top,
      left: Number(parsed.left) || defaults.left,
      width: Number(parsed.width) || defaults.width,
      height: Number(parsed.height) || defaults.height,
    };
  } catch {
    return defaults;
  }
}

function saveLayout(storageKey, layout) {
  if (!storageKey) return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

function clampLayout(layout) {
  const width = Math.min(
    Math.max(280, layout.width),
    window.innerWidth - VIEWPORT_PADDING * 2
  );

  const height = Math.min(
    Math.max(240, layout.height),
    window.innerHeight - VIEWPORT_PADDING * 2
  );

  const left = Math.min(
    Math.max(VIEWPORT_PADDING, layout.left),
    window.innerWidth - width - VIEWPORT_PADDING
  );

  const top = Math.min(
    Math.max(VIEWPORT_PADDING, layout.top),
    window.innerHeight - height - VIEWPORT_PADDING
  );

  return { top, left, width, height };
}

export function getDefaultPanelLayout({ anchorRect, width = 360, height = 480 }) {
  if (!anchorRect) {
    return clampLayout({
      top: VIEWPORT_PADDING + 48,
      left: VIEWPORT_PADDING,
      width,
      height,
    });
  }

  let left = anchorRect.right + 12;
  let top = anchorRect.top;

  if (left + width > window.innerWidth - VIEWPORT_PADDING) {
    left = Math.max(VIEWPORT_PADDING, anchorRect.left - width - 12);
  }

  return clampLayout({ top, left, width, height });
}

export default function useDraggablePanel({
  storageKey,
  isOpen,
  defaultWidth = 360,
  defaultHeight = 480,
  anchorRect = null,
}) {
  const panelRef = useRef(null);
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);

  const [layout, setLayout] = useState(() =>
    loadLayout(storageKey, getDefaultPanelLayout({ anchorRect, width: defaultWidth, height: defaultHeight }))
  );

  useEffect(() => {
    if (!isOpen) return;

    setLayout((current) => {
      const hasStored = Boolean(storageKey && localStorage.getItem(storageKey));

      if (hasStored) {
        return clampLayout(current);
      }

      return getDefaultPanelLayout({
        anchorRect,
        width: defaultWidth,
        height: defaultHeight,
      });
    });
  }, [isOpen, anchorRect, defaultWidth, defaultHeight, storageKey]);

  const persistLayout = useCallback(
    (nextLayout) => {
      const normalized = clampLayout(nextLayout);
      setLayout(normalized);
      saveLayout(storageKey, normalized);
    },
    [storageKey]
  );

  const handleHeaderPointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startTop: layout.top,
        startLeft: layout.left,
      };

      const handlePointerMove = (moveEvent) => {
        if (!dragStateRef.current) return;

        const deltaX = moveEvent.clientX - dragStateRef.current.startX;
        const deltaY = moveEvent.clientY - dragStateRef.current.startY;

        persistLayout({
          ...layout,
          top: dragStateRef.current.startTop + deltaY,
          left: dragStateRef.current.startLeft + deltaX,
        });
      };

      const handlePointerUp = () => {
        dragStateRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [layout, persistLayout]
  );

  const handleResizePointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      resizeStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startWidth: layout.width,
        startHeight: layout.height,
      };

      const handlePointerMove = (moveEvent) => {
        if (!resizeStateRef.current) return;

        const deltaX = moveEvent.clientX - resizeStateRef.current.startX;
        const deltaY = moveEvent.clientY - resizeStateRef.current.startY;

        persistLayout({
          ...layout,
          width: resizeStateRef.current.startWidth + deltaX,
          height: resizeStateRef.current.startHeight + deltaY,
        });
      };

      const handlePointerUp = () => {
        resizeStateRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [layout, persistLayout]
  );

  return {
    panelRef,
    layout,
    handleHeaderPointerDown,
    handleResizePointerDown,
  };
}
