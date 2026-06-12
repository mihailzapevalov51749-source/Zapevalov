import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { computeCalendarPopoverPosition } from "../utils/computeCalendarPopoverPosition";
import { formatJournalDateFilterLabel } from "../utils/filterPlatformEventJournalEntries";
import PlatformEventJournalCalendar from "./PlatformEventJournalCalendar";

import "./platformEventJournalDateFilter.css";

export default function PlatformEventJournalDateFilter({
  value = null,
  onChange,
  disabled = false,
}) {
  const fieldId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const label = formatJournalDateFilterLabel(value);
  const hasValue = Boolean(value?.start);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;

    if (!trigger || !popover) {
      return;
    }

    const anchorRect = trigger.getBoundingClientRect();
    const placement = computeCalendarPopoverPosition(anchorRect, {
      width: popover.offsetWidth,
      height: popover.offsetHeight,
    });

    setPopoverStyle({
      position: "fixed",
      top: `${placement.top}px`,
      left: `${placement.left}px`,
      zIndex: 40,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPopoverStyle(null);
      return undefined;
    }

    updatePopoverPosition();
    const frameId = window.requestAnimationFrame(updatePopoverPosition);

    const handleReposition = () => {
      updatePopoverPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        !rootRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const togglePicker = useCallback(() => {
    if (disabled) {
      return;
    }

    setIsOpen((previous) => !previous);
  }, [disabled]);

  const handleClear = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onChange?.(null);
      setIsOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={rootRef} className="platform-event-journal-date-filter">
      <button
        ref={triggerRef}
        type="button"
        id={fieldId}
        className={`platform-event-journal-date-filter__trigger${
          hasValue ? " has-value" : ""
        }`}
        onClick={togglePicker}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={label ? `Дата: ${label}` : "Выбрать дату или период"}
      >
        <span className="platform-event-journal-date-filter__label">Дата</span>
        <span className="platform-event-journal-date-filter__value">
          {label || "—"}
        </span>
      </button>

      <div className="platform-event-journal-date-filter__clear-slot">
        {hasValue ? (
          <button
            type="button"
            className="platform-event-journal-date-filter__clear"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Очистить дату"
          >
            ×
          </button>
        ) : null}
      </div>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              className="platform-event-journal-date-filter__popover"
              style={
                popoverStyle ?? {
                  visibility: "hidden",
                  position: "fixed",
                  top: "-9999px",
                  left: "-9999px",
                }
              }
            >
              <PlatformEventJournalCalendar
                value={value}
                onChange={onChange}
                onClose={() => setIsOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
