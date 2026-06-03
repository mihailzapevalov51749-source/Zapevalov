import { useCallback, useEffect, useRef, useState } from "react";

import { YASII_FLOATING_SAFE_RIGHT_PX } from "../layout/yasiiFloatingSafeArea";
import {
  CARD_SETTINGS_MODAL_DEFAULT_BOUNDS,
  CARD_SETTINGS_MODAL_KEY,
  debugCardSettingsModal,
} from "./cardSettingsModalDebug";
import { loadModalBounds, saveModalBounds } from "./modalUiPreferences";

function isCardSettingsModalKey(modalKey) {
  return String(modalKey || "").trim() === CARD_SETTINGS_MODAL_KEY;
}

export const PLATFORM_MODAL_MIN_WIDTH = 320;
export const PLATFORM_MODAL_MIN_HEIGHT = 300;
/** Viewport margin: 12px top + 12px bottom (and left/right for max size). */
export const PLATFORM_MODAL_EDGE_INSET_PX = 12;
/** Minimum visible strip of the modal (header) that must stay in the workspace. */
export const PLATFORM_MODAL_MIN_VISIBLE_GRIP_PX = 96;

/**
 * @returns {{
 *   workspaceWidth: number,
 *   workspaceHeight: number,
 *   minWidth: number,
 *   minHeight: number,
 *   maxWidth: number,
 *   maxHeight: number,
 *   edgeInset: number,
 * }}
 */
export function getViewportMetrics() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const edge = PLATFORM_MODAL_EDGE_INSET_PX;
  const viewportMargin = edge * 2;

  const maxWidth = Math.max(
    PLATFORM_MODAL_MIN_WIDTH,
    viewportWidth - viewportMargin,
  );
  const maxHeight = Math.max(
    PLATFORM_MODAL_MIN_HEIGHT,
    viewportHeight - viewportMargin,
  );

  const workspaceWidth = Math.max(
    PLATFORM_MODAL_MIN_WIDTH,
    viewportWidth - YASII_FLOATING_SAFE_RIGHT_PX,
  );
  const workspaceHeight = maxHeight;

  return {
    workspaceWidth,
    workspaceHeight,
    minWidth: PLATFORM_MODAL_MIN_WIDTH,
    minHeight: PLATFORM_MODAL_MIN_HEIGHT,
    maxWidth,
    maxHeight,
    edgeInset: edge,
  };
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} bounds
 * @param {ReturnType<typeof getViewportMetrics>} [metrics]
 */
export function clampModalBounds(bounds, metrics = getViewportMetrics()) {
  const width = Math.min(
    Math.max(bounds.width, metrics.minWidth),
    metrics.maxWidth,
  );
  const height = Math.min(
    Math.max(bounds.height, metrics.minHeight),
    metrics.maxHeight,
  );

  const grip = PLATFORM_MODAL_MIN_VISIBLE_GRIP_PX;
  const edge = metrics.edgeInset ?? PLATFORM_MODAL_EDGE_INSET_PX;
  const minX = -(width - grip);
  const maxX = metrics.workspaceWidth - grip;
  const minY = edge;
  const maxY = Math.max(edge, metrics.workspaceHeight - grip);

  return {
    x: Math.min(Math.max(bounds.x, minX), maxX),
    y: Math.min(Math.max(bounds.y, minY), maxY),
    width,
    height,
  };
}

/**
 * @param {{ width?: number, height?: number, x?: number, y?: number }} [defaults]
 */
function readBoundNumber(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function computeDefaultModalBounds(defaults = {}) {
  const metrics = getViewportMetrics();
  const width = readBoundNumber(defaults.width, metrics.minWidth);
  const height = readBoundNumber(
    defaults.height,
    Math.max(metrics.minHeight, metrics.maxHeight - 24),
  );
  const x = readBoundNumber(
    defaults.x,
    Math.max(metrics.edgeInset, metrics.workspaceWidth - width),
  );
  const y = readBoundNumber(defaults.y, PLATFORM_MODAL_EDGE_INSET_PX);

  return clampModalBounds({ x, y, width, height }, metrics);
}

function resolveInitialModalBounds(modalKey, canCustomizeLayout, defaultBounds) {
  const defaults = computeDefaultModalBounds(defaultBounds);

  if (!canCustomizeLayout) {
    return defaults;
  }

  const stored = loadModalBounds(modalKey);

  if (!stored) {
    return defaults;
  }

  if (!isCardSettingsModalKey(modalKey)) {
    return clampModalBounds(stored);
  }

  return clampModalBounds({
    x: readBoundNumber(stored.x, defaults.x),
    y: readBoundNumber(stored.y, defaults.y),
    width: readBoundNumber(stored.width, defaults.width),
    height: readBoundNumber(stored.height, defaults.height),
  });
}

/**
 * @param {{
 *   modalKey: string,
 *   open: boolean,
 *   canCustomizeLayout?: boolean,
 *   defaultBounds?: { width?: number, height?: number, x?: number, y?: number },
 * }} params
 */
export default function usePlatformModalLayout({
  modalKey,
  open,
  canCustomizeLayout = false,
  defaultBounds = {},
}) {
  const [bounds, setBounds] = useState(() =>
    computeDefaultModalBounds(defaultBounds),
  );
  const boundsRef = useRef(bounds);
  const defaultBoundsRef = useRef(defaultBounds);
  const wasOpenRef = useRef(false);
  const canCustomizeRef = useRef(canCustomizeLayout);
  const modalKeyRef = useRef(modalKey);

  defaultBoundsRef.current = defaultBounds;
  canCustomizeRef.current = canCustomizeLayout;
  modalKeyRef.current = modalKey;

  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  const applyBounds = useCallback((rawBounds) => {
    const next = clampModalBounds(rawBounds, getViewportMetrics());
    boundsRef.current = next;
    setBounds(next);
    return next;
  }, []);

  const persistCurrentBounds = useCallback(() => {
    if (!canCustomizeRef.current) {
      if (isCardSettingsModalKey(modalKeyRef.current)) {
        debugCardSettingsModal("persist skipped: canCustomizeLayout=false");
      }

      return null;
    }

    const next = clampModalBounds(boundsRef.current, getViewportMetrics());
    boundsRef.current = next;
    setBounds(next);
    saveModalBounds(modalKeyRef.current, next);

    if (isCardSettingsModalKey(modalKeyRef.current)) {
      debugCardSettingsModal("persist bounds", next);
    }

    return next;
  }, []);

  const persistRef = useRef(persistCurrentBounds);
  persistRef.current = persistCurrentBounds;

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        persistRef.current();
        wasOpenRef.current = false;
      }

      return undefined;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      const stored = canCustomizeLayout ? loadModalBounds(modalKey) : null;
      const initial = resolveInitialModalBounds(
        modalKey,
        canCustomizeLayout,
        isCardSettingsModalKey(modalKey)
          ? CARD_SETTINGS_MODAL_DEFAULT_BOUNDS
          : defaultBoundsRef.current,
      );
      const next = applyBounds(initial);

      if (isCardSettingsModalKey(modalKey)) {
        debugCardSettingsModal("open", {
          canCustomizeLayout,
          loadedBounds: stored,
          appliedBounds: next,
        });
      }

      if (canCustomizeLayout && stored) {
        saveModalBounds(modalKey, next);
      }
    }

    function handleResize() {
      applyBounds(boundsRef.current);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [open, modalKey, canCustomizeLayout, applyBounds]);

  useEffect(
    () => () => {
      if (wasOpenRef.current && canCustomizeRef.current) {
        const next = clampModalBounds(boundsRef.current, getViewportMetrics());
        saveModalBounds(modalKeyRef.current, next);
      }
    },
    [],
  );

  const startDrag = useCallback(
    (event) => {
      if (isCardSettingsModalKey(modalKeyRef.current)) {
        debugCardSettingsModal("mousedown header", {
          dragAllowed: canCustomizeRef.current,
          startBounds: boundsRef.current,
        });
      }

      if (!canCustomizeRef.current || event.button !== 0) {
        return;
      }

      if (
        event.target instanceof Element &&
        event.target.closest("[data-platform-modal-no-drag]")
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (isCardSettingsModalKey(modalKeyRef.current)) {
        debugCardSettingsModal("drag start", boundsRef.current);
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const origin = { ...boundsRef.current };

      function onMove(moveEvent) {
        const nextBounds = applyBounds({
          ...origin,
          x: origin.x + (moveEvent.clientX - startX),
          y: origin.y + (moveEvent.clientY - startY),
        });

        if (isCardSettingsModalKey(modalKeyRef.current)) {
          debugCardSettingsModal("drag move", nextBounds);
        }
      }

      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        persistRef.current();
      }

      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [applyBounds],
  );

  const startResize = useCallback(
    (direction, event) => {
      if (!canCustomizeRef.current || event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const origin = { ...boundsRef.current };

      function onMove(moveEvent) {
        let nextWidth = origin.width;
        let nextHeight = origin.height;

        if (direction.includes("e")) {
          nextWidth = origin.width + (moveEvent.clientX - startX);
        }

        if (direction.includes("s")) {
          nextHeight = origin.height + (moveEvent.clientY - startY);
        }

        applyBounds({
          ...origin,
          width: nextWidth,
          height: nextHeight,
        });
      }

      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        persistRef.current();
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [applyBounds],
  );

  const headerCursor = canCustomizeLayout ? "move" : "default";

  return {
    bounds,
    headerCursor,
    startDrag,
    startResize,
    persistCurrentBounds,
  };
}
