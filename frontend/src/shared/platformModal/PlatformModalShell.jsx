import { createPortal } from "react-dom";

import closeIcon from "../../assets/icons/x.svg";

import {
  closeButtonCompactStyle,
  closeButtonStyle,
  contentStyle,
  footerShellStyle,
  headerCompactStyle,
  headerStyle,
  overlayStyle,
  panelShellStyle,
  PLATFORM_MODAL_HEADER_HEIGHT_COMPACT,
  PLATFORM_MODAL_HEADER_HEIGHT_DEFAULT,
  resizeHandleEastStyle,
  resizeHandleSouthEastStyle,
  resizeHandleSouthStyle,
  subtitleStyle,
  titleCompactStyle,
  titleStyle,
} from "./platformModalStyles";

/**
 * @param {{
 *   open?: boolean,
 *   onClose?: (reason?: string) => void,
 *   title?: string,
 *   subtitle?: string | null,
 *   canCustomizeLayout?: boolean,
 *   modalKey?: string,
 *   ariaLabel?: string,
 *   children?: import('react').ReactNode,
 *   footer?: import('react').ReactNode | null,
 *   contentStyle?: Record<string, unknown>,
 *   bounds: { x: number, y: number, width: number, height: number },
 *   headerCursor?: string,
 *   startDrag?: (event: import('react').MouseEvent) => void,
 *   startResize?: (direction: string, event: import('react').MouseEvent) => void,
 *   hideHeader?: boolean,
 *   transparentBackdrop?: boolean,
 * }} props
 */
export default function PlatformModalShell({
  open = false,
  onClose,
  title = "",
  subtitle = null,
  canCustomizeLayout = false,
  modalKey = "",
  ariaLabel,
  children = null,
  footer = null,
  contentStyle: contentStyleOverride = null,
  bounds,
  headerCursor = "default",
  startDrag,
  startResize,
  hideHeader = false,
  transparentBackdrop = false,
  headerDensity = "default",
  titleAccessory = null,
}) {
  if (!open) {
    return null;
  }

  const isCompactHeader = headerDensity === "compact";
  const resolvedHeaderStyle = isCompactHeader ? headerCompactStyle : headerStyle;
  const resolvedTitleStyle = isCompactHeader ? titleCompactStyle : titleStyle;
  const resolvedCloseButtonStyle = isCompactHeader
    ? closeButtonCompactStyle
    : closeButtonStyle;
  const headerHeightPx = isCompactHeader
    ? PLATFORM_MODAL_HEADER_HEIGHT_COMPACT
    : PLATFORM_MODAL_HEADER_HEIGHT_DEFAULT;

  const panelStyle = {
    ...panelShellStyle,
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    margin: 0,
    right: "auto",
    bottom: "auto",
    transform: "none",
  };

  const resolvedOverlayStyle = transparentBackdrop
    ? {
        ...overlayStyle,
        background: "transparent",
        pointerEvents: "none",
      }
    : overlayStyle;

  return createPortal(
    <div
      style={resolvedOverlayStyle}
      onMouseDown={
        transparentBackdrop
          ? undefined
          : (event) => {
              if (event.target === event.currentTarget) {
                onClose?.("overlay");
              }
            }
      }
      role="presentation"
      data-platform-modal-overlay
      data-platform-modal-key={modalKey || undefined}
    >
      <aside
        style={{ ...panelStyle, pointerEvents: "auto", position: "fixed" }}
        aria-label={ariaLabel || title || "Модальное окно"}
        data-platform-modal-panel
        data-platform-modal-key={modalKey || undefined}
      >
        {hideHeader ? null : (
          <div
            style={{ ...resolvedHeaderStyle, cursor: headerCursor }}
            onMouseDown={canCustomizeLayout ? startDrag : undefined}
            data-platform-modal-drag-handle
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              {title || titleAccessory ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  {title ? <div style={resolvedTitleStyle}>{title}</div> : null}
                  {titleAccessory || null}
                </div>
              ) : null}
              {subtitle ? <div style={subtitleStyle}>{subtitle}</div> : null}
            </div>
            <button
              type="button"
              onClick={() => onClose?.("close-button")}
              onMouseDown={(event) => event.stopPropagation()}
              style={resolvedCloseButtonStyle}
              data-platform-modal-no-drag
              aria-label="Закрыть"
            >
              <img
                src={closeIcon}
                alt=""
                style={{ width: 16, height: 16 }}
                draggable={false}
              />
            </button>
          </div>
        )}

        <div style={{ ...contentStyle, ...contentStyleOverride }}>{children}</div>

        {footer ? <div style={footerShellStyle}>{footer}</div> : null}

        {canCustomizeLayout ? (
          <>
            <div
              style={{
                ...resizeHandleEastStyle,
                top: hideHeader ? 0 : headerHeightPx,
                height: hideHeader ? "100%" : `calc(100% - ${headerHeightPx}px)`,
                zIndex: 20,
                pointerEvents: "auto",
              }}
              onMouseDown={(event) => startResize?.("e", event)}
              aria-hidden
            />
            <div
              style={{
                ...resizeHandleSouthStyle,
                zIndex: 20,
                pointerEvents: "auto",
              }}
              onMouseDown={(event) => startResize?.("s", event)}
              aria-hidden
            />
            <div
              style={{
                ...resizeHandleSouthEastStyle,
                zIndex: 21,
                pointerEvents: "auto",
              }}
              onMouseDown={(event) => startResize?.("se", event)}
              aria-hidden
            />
          </>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
