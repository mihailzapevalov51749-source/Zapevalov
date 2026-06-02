const overlayStack = [];

function normalizeOverlayId(overlayId) {
  return String(overlayId ?? "").trim();
}

export function registerOverlay(overlayId) {
  const normalizedId = normalizeOverlayId(overlayId);
  if (!normalizedId) {
    return null;
  }

  const existingIndex = overlayStack.indexOf(normalizedId);
  if (existingIndex >= 0) {
    overlayStack.splice(existingIndex, 1);
  }

  overlayStack.push(normalizedId);
  return normalizedId;
}

export function unregisterOverlay(overlayId) {
  const normalizedId = normalizeOverlayId(overlayId);
  if (!normalizedId) {
    return false;
  }

  const existingIndex = overlayStack.indexOf(normalizedId);
  if (existingIndex < 0) {
    return false;
  }

  overlayStack.splice(existingIndex, 1);
  return true;
}

export function isTopOverlay(overlayId) {
  const normalizedId = normalizeOverlayId(overlayId);
  if (!normalizedId || overlayStack.length === 0) {
    return false;
  }

  return overlayStack[overlayStack.length - 1] === normalizedId;
}

export function getOverlayStackSnapshot() {
  return [...overlayStack];
}
