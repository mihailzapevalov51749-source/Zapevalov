import { useCallback, useEffect, useMemo } from "react";

import PlatformModalShell from "./PlatformModalShell";
import usePlatformModalLayout, {
  resolvePlatformModalMinWidth,
} from "./usePlatformModalLayout";

/**
 * Platform work modal: drag (header), resize (E/S/SE), persisted bounds.
 *
 * Accent theme: inherits data-platform-zone from PlatformModalShell
 * (Studio = purple, Office = blue). Do not hardcode accent colors in modal content.
 *
 * layoutPreset:
 * - "standard" — work modals (forms); min width = PLATFORM_MODAL_STANDARD_MIN_WIDTH (300px)
 * - "compact" — confirm/notice dialogs; smaller min width allowed
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
  keepFullyVisible = false,
  viewportInset = 24,
  headerDensity = "default",
  titleAccessory = null,
  layoutPreset = "standard",
}) {
  const resolvedDefaultBounds = useMemo(() => {
    const base =
      defaultBounds && typeof defaultBounds === "object" ? { ...defaultBounds } : {};

    base.minWidth = resolvePlatformModalMinWidth(layoutPreset, base.minWidth);

    return base;
  }, [defaultBounds, layoutPreset]);

  const layout = usePlatformModalLayout({
    modalKey,
    open,
    canCustomizeLayout,
    defaultBounds: resolvedDefaultBounds,
    keepFullyVisible,
    viewportInset,
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
      headerDensity={headerDensity}
      titleAccessory={titleAccessory}
    >
      {renderedChildren}
    </PlatformModalShell>
  );
}
