import { useEffect, useRef, useState } from "react";

import yasiiLogo from "../../assets/yasii.png";
import {
  isTopOverlay,
  registerOverlay,
  unregisterOverlay,
} from "../../shared/overlay/overlayStack.js";
import { useYasiiAssistantSession } from "../context/YasiiAssistantContext.jsx";
import { isYasiiPanelPresentation } from "../presentation/yasiiPresentationState.js";
import { shouldCloseFloatingOnOutsideClick } from "../workspace/yasiiFloatingDismiss.js";
import YasiiEmbeddedPanel from "./YasiiEmbeddedPanel.jsx";

import "../styles.css";

/**
 * Unified YASII entry launcher — fixed bottom-right on every platform surface.
 * HostContext differs between Dashboard, global entry, and future surfaces.
 */
export default function YasiiLauncher({
  surfaceId,
  contextData,
  inputPlaceholder,
  className = "",
}) {
  const session = useYasiiAssistantSession();
  const [localPanelOpen, setLocalPanelOpen] = useState(false);
  const isPanelOpen = session
    ? isYasiiPanelPresentation(session.presentation)
    : localPanelOpen;
  const setIsPanelOpen = session?.setFloatingOpen ?? setLocalPanelOpen;
  const isPinned = session?.isPinned ?? false;
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const overlayIdRef = useRef(`yasii-launcher-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (!isPanelOpen) {
      unregisterOverlay(overlayIdRef.current);
      return undefined;
    }

    registerOverlay(overlayIdRef.current);
    return () => {
      unregisterOverlay(overlayIdRef.current);
    };
  }, [isPanelOpen]);

  useEffect(() => {
    if (!isPanelOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;

      if (buttonRef.current?.contains(target)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      if (!isTopOverlay(overlayIdRef.current)) {
        return;
      }

      if (
        !shouldCloseFloatingOnOutsideClick(target, {
          panelElement: panelRef.current,
          buttonElement: buttonRef.current,
          isPinned,
        })
      ) {
        return;
      }

      setIsPanelOpen(false);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isPanelOpen, isPinned, setIsPanelOpen]);

  useEffect(() => {
    if (!isPanelOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isPinned) {
        return;
      }

      setIsPanelOpen(false);
      event.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPanelOpen, isPinned, setIsPanelOpen]);

  const wrapperClassName = ["yasii-launcher", "yasii-launcher--floating", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={wrapperClassName}>
        <button
          ref={buttonRef}
          type="button"
          className={`yasii-launcher__button${isPanelOpen ? " yasii-launcher__button--active" : ""}`}
          aria-label="Открыть ЯСИИ"
          aria-expanded={isPanelOpen}
          onClick={() => setIsPanelOpen((previous) => !previous)}
        >
          <img
            src={yasiiLogo}
            alt=""
            className="yasii-launcher__logo"
            aria-hidden="true"
          />
        </button>
      </div>

      <YasiiEmbeddedPanel
        ref={panelRef}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        surfaceId={surfaceId}
        contextData={contextData}
        inputPlaceholder={inputPlaceholder}
      />
    </>
  );
}
