import { useEffect, useState } from "react";

const SEARCH_INPUT_SELECTOR = ".app-header-renderer__search:not([disabled])";

function readSearchInputRect() {
  const element = document.querySelector(SEARCH_INPUT_SELECTOR);
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  return {
    top: rect.bottom,
    left: rect.left,
    width: rect.width,
  };
}

/**
 * Tracks header search input position for dropdown overlay anchoring.
 *
 * @param {boolean} isActive
 */
export function useSearchInputAnchor(isActive) {
  const [anchorRect, setAnchorRect] = useState(null);

  useEffect(() => {
    if (!isActive) {
      setAnchorRect(null);
      return undefined;
    }

    const update = () => {
      setAnchorRect(readSearchInputRect());
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isActive]);

  return anchorRect;
}

export { SEARCH_INPUT_SELECTOR, readSearchInputRect };
