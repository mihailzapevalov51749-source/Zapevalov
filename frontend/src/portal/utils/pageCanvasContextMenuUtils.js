import { PAGE_CANVAS_INTERACTIVE_SELECTOR } from "../constants/pageCanvasBlockTypes";

export function findSectionIdFromPoint({ clientX, clientY }) {
  const elements = document.elementsFromPoint(clientX, clientY);

  for (const element of elements) {
    const host = element.closest?.("[data-section-host-id]");

    if (host) {
      return host.getAttribute("data-section-host-id");
    }
  }

  return null;
}

export function shouldSuppressCanvasContextMenu(event) {
  const target = event.target;

  if (!target?.closest) {
    return false;
  }

  if (target.closest("[data-block-host-id]")) {
    return true;
  }

  if (target.closest(PAGE_CANVAS_INTERACTIVE_SELECTOR)) {
    return true;
  }

  if (target.closest("[data-page-top-bar]")) {
    return true;
  }

  return false;
}

export function clampMenuPosition(x, y, menuWidth, menuHeight) {
  const padding = 8;
  const maxX = Math.max(padding, window.innerWidth - menuWidth - padding);
  const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);

  return {
    x: Math.min(Math.max(padding, x), maxX),
    y: Math.min(Math.max(padding, y), maxY),
  };
}
