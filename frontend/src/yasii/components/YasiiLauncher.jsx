import { useEffect, useRef, useState } from "react";

import yasiiLogo from "../../assets/yasii.png";
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
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

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

      setIsPanelOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isPanelOpen]);

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
