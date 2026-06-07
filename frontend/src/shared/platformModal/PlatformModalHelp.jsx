import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";

import { PLATFORM_MODAL_Z_INDEX } from "./platformModalStyles";

import "./platformModalHelp.css";

const HELP_CARD_Z_INDEX = PLATFORM_MODAL_Z_INDEX + 12;
const VIEWPORT_INSET = 12;
const TRIGGER_GAP = 8;
const HOVER_HIDE_DELAY_MS = 120;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function computeHelpCardPosition(triggerRect, cardRect) {
  const cardWidth = cardRect.width || 300;
  const cardHeight = cardRect.height || 96;

  let top = triggerRect.top - cardHeight - TRIGGER_GAP;
  let left = triggerRect.left;

  if (top < VIEWPORT_INSET) {
    top = triggerRect.bottom + TRIGGER_GAP;
  }

  if (top + cardHeight > window.innerHeight - VIEWPORT_INSET) {
    top = clamp(
      triggerRect.top - cardHeight - TRIGGER_GAP,
      VIEWPORT_INSET,
      window.innerHeight - cardHeight - VIEWPORT_INSET,
    );
  }

  left = clamp(
    left,
    VIEWPORT_INSET,
    window.innerWidth - cardWidth - VIEWPORT_INSET,
  );

  top = clamp(
    top,
    VIEWPORT_INSET,
    window.innerHeight - cardHeight - VIEWPORT_INSET,
  );

  return { top, left };
}

/**
 * Unified hover/focus help card for PlatformModal footer.
 */
export default function PlatformModalHelp({
  title = "",
  description = "",
  className = "",
}) {
  const tooltipId = useId();
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const card = cardRef.current;
    if (!trigger || !card) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    setPosition(computeHelpCardPosition(triggerRect, cardRect));
  }, []);

  const show = useCallback(() => {
    clearHideTimer();
    setOpen(true);
  }, [clearHideTimer]);

  const hide = useCallback(() => {
    clearHideTimer();
    setOpen(false);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      hideTimerRef.current = null;
    }, HOVER_HIDE_DELAY_MS);
  }, [clearHideTimer]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    updatePosition();

    let frameId = 0;
    const tick = () => {
      updatePosition();
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      hide();
      triggerRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [hide, open]);

  useEffect(
    () => () => {
      clearHideTimer();
    },
    [clearHideTimer],
  );

  const resolvedTitle = String(title || "").trim();
  const resolvedDescription = String(description || "").trim();

  if (!resolvedTitle && !resolvedDescription) {
    return null;
  }

  const card =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={cardRef}
            id={tooltipId}
            className="platform-modal-help__card"
            style={{
              top: position.top,
              left: position.left,
              zIndex: HELP_CARD_Z_INDEX,
            }}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={scheduleHide}
          >
            {resolvedTitle ? (
              <p className="platform-modal-help__title">{resolvedTitle}</p>
            ) : null}
            {resolvedDescription ? (
              <p className="platform-modal-help__description">
                {resolvedDescription}
              </p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <span className={`platform-modal-help${className ? ` ${className}` : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="designer-btn platform-modal-footer__help-btn"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={hide}
      >
        <CircleHelp size={16} aria-hidden />
        <span>Справка</span>
      </button>
      {card}
    </span>
  );
}
