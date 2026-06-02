export const YASII_SURFACE_BRIDGE_EVENT = "yasnopro:yasii:surface";

/** @type {object | null} */
let publishedSurface = null;
/** @type {{ token: string, value: object | null }[]} */
const publisherStack = [];

function dispatchBridgeEvent(detail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(YASII_SURFACE_BRIDGE_EVENT, {
      detail,
    }),
  );
}

function syncPublishedSurface() {
  for (let index = publisherStack.length - 1; index >= 0; index -= 1) {
    const candidate = publisherStack[index]?.value;
    if (candidate?.surfaceId) {
      publishedSurface = candidate;
      dispatchBridgeEvent(publishedSurface);
      return;
    }
  }

  publishedSurface = null;
  dispatchBridgeEvent(null);
}

/**
 * Publish active YASII surface for global entry (YasiiFloatingButton lives outside React provider tree).
 * @param {object | null} surfaceValue
 * @param {string} [publisherToken]
 */
export function publishYasiiSurface(surfaceValue, publisherToken) {
  const token = String(publisherToken ?? "");
  const entry = {
    token,
    value: surfaceValue?.surfaceId ? surfaceValue : null,
  };
  const entryIndex = publisherStack.findIndex((item) => item.token === token);

  if (entryIndex >= 0) {
    publisherStack[entryIndex] = entry;
  } else {
    publisherStack.push(entry);
  }

  syncPublishedSurface();
}

/**
 * @param {string} [publisherToken]
 */
export function clearYasiiSurface(publisherToken) {
  const token = String(publisherToken ?? "");
  const nextStack = publisherStack.filter((item) => item.token !== token);

  publisherStack.length = 0;
  publisherStack.push(...nextStack);
  syncPublishedSurface();
}

export function getPublishedYasiiSurface() {
  return publishedSurface;
}
