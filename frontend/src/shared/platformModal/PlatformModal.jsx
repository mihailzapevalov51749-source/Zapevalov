import { useCallback, useEffect } from "react";

import PlatformModalShell from "./PlatformModalShell";
import usePlatformModalLayout from "./usePlatformModalLayout";

/**
 * Platform work modal: drag (header), resize (E/S/SE), persisted bounds.
 */
export default function PlatformModal({
  modalKey,
  open = false,
  onClose,
  title = "",
  subtitle = null,
  canCustomizeLayout = false,
  defaultBounds = undefined,
  ariaLabel,
  children = null,
  footer = null,
  contentStyle: contentStyleOverride = null,
  hideHeader = false,
  transparentBackdrop = false,
}) {
  const layout = usePlatformModalLayout({
    modalKey,
    open,
    canCustomizeLayout,
    defaultBounds,
  });

  const { persistCurrentBounds } = layout;

  const handleClose = useCallback(
    (reason) => {
      persistCurrentBounds();
      onClose?.(reason);
    },
    [onClose, persistCurrentBounds],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose("escape");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  const renderedChildren =
    typeof children === "function" ? children(layout) : children;

  return (
    <PlatformModalShell
      open={open}
      modalKey={modalKey}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      canCustomizeLayout={canCustomizeLayout}
      ariaLabel={ariaLabel}
      footer={footer}
      contentStyle={contentStyleOverride}
      bounds={layout.bounds}
      headerCursor={layout.headerCursor}
      startDrag={layout.startDrag}
      startResize={layout.startResize}
      hideHeader={hideHeader}
      transparentBackdrop={transparentBackdrop}
    >
      {renderedChildren}
    </PlatformModalShell>
  );
}
