import { useCallback, useEffect, useRef, useState } from "react";

import { clampMenuPosition } from "../utils/pageCanvasContextMenuUtils";

const MENU_WIDTH = 220;
const MENU_ITEM_HEIGHT = 36;
const MENU_PADDING = 8;

export default function usePageCanvasContextMenu({ isEnabled }) {
  const [menuState, setMenuState] = useState(null);
  const menuRef = useRef(null);

  const closeMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  const openMenu = useCallback((event) => {
    if (!isEnabled) return;

    event.preventDefault();
    event.stopPropagation();

    const estimatedHeight =
      MENU_PADDING * 2 + 10 * MENU_ITEM_HEIGHT;

    const position = clampMenuPosition(
      event.clientX,
      event.clientY,
      MENU_WIDTH,
      estimatedHeight
    );

    setMenuState({
      x: position.x,
      y: position.y,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, [isEnabled]);

  useEffect(() => {
    if (!menuState) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    function handlePointerDown(event) {
      if (menuRef.current?.contains(event.target)) {
        return;
      }

      closeMenu();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuState, closeMenu]);

  useEffect(() => {
    if (!menuState || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const position = clampMenuPosition(menuState.x, menuState.y, rect.width, rect.height);

    if (position.x !== menuState.x || position.y !== menuState.y) {
      setMenuState((current) =>
        current
          ? {
              ...current,
              x: position.x,
              y: position.y,
            }
          : current
      );
    }
  }, [menuState]);

  return {
    menuState,
    menuRef,
    openMenu,
    closeMenu,
  };
}
