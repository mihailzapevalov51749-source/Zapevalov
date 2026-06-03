const STORAGE_KEY = "yasnopro-modal-ui-preferences-v1";

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} ModalBounds
 */

/**
 * @param {unknown} value
 * @returns {ModalBounds | null}
 */
function normalizeBounds(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = /** @type {Record<string, unknown>} */ (value);
  const x = Number(source.x);
  const y = Number(source.y);
  const width = Number(source.width);
  const height = Number(source.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  return { x, y, width, height };
}

/**
 * @returns {Record<string, ModalBounds>}
 */
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || !parsed.modals) {
      return {};
    }

    const result = {};

    for (const [key, value] of Object.entries(parsed.modals)) {
      const bounds = normalizeBounds(value);

      if (bounds) {
        result[String(key)] = bounds;
      }
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * @param {string} modalKey
 * @returns {ModalBounds | null}
 */
export function loadModalBounds(modalKey) {
  const normalizedKey = String(modalKey || "").trim();

  if (!normalizedKey) {
    return null;
  }

  return readStore()[normalizedKey] ?? null;
}

/**
 * @param {string} modalKey
 * @param {ModalBounds} bounds
 */
export function clearModalBounds(modalKey) {
  const normalizedKey = String(modalKey || "").trim();

  if (!normalizedKey) {
    return;
  }

  const store = readStore();
  delete store[normalizedKey];

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        modals: store,
      }),
    );
  } catch {
    // ignore
  }
}

export function saveModalBounds(modalKey, bounds) {
  const normalizedKey = String(modalKey || "").trim();

  if (!normalizedKey || !bounds) {
    return;
  }

  const nextBounds = normalizeBounds(bounds);

  if (!nextBounds) {
    return;
  }

  const store = readStore();
  store[normalizedKey] = nextBounds;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        modals: store,
      }),
    );
  } catch {
    // ignore quota / private mode
  }
}
