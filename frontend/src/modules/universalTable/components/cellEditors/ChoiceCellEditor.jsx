import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DEFAULT_OPTION_COLOR = "#6b7280";
const CELL_EDITOR_HEIGHT = 28;
const MENU_GAP = 6;
const MENU_MIN_WIDTH = 190;
const MENU_MAX_HEIGHT = 260;
const MENU_VERTICAL_PADDING = 12;
const MENU_ITEM_HEIGHT = 30;
const MENU_EMPTY_ITEM_HEIGHT = 28;
const MENU_PADDING_Y = 12;

const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

const getJustifyByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return [];

  return options
    .map((option, index) => {
      if (typeof option === "string") {
        return {
          id: `option-${index}-${option}`,
          label: option,
          color: DEFAULT_OPTION_COLOR,
        };
      }

      return {
        id: option?.id || `option-${index}`,
        label: option?.label || "",
        color: option?.color || DEFAULT_OPTION_COLOR,
      };
    })
    .filter((option) => option.label.trim());
};

const calculateMenuPosition = (buttonElement, optionsCount = 0) => {
  if (!buttonElement) return null;

  const rect = buttonElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  const naturalMenuHeight =
    MENU_EMPTY_ITEM_HEIGHT + optionsCount * MENU_ITEM_HEIGHT + MENU_PADDING_Y;

  const desiredHeight = Math.min(naturalMenuHeight, MENU_MAX_HEIGHT);

  const spaceBelow =
    viewportHeight - rect.bottom - MENU_GAP - MENU_VERTICAL_PADDING;

  const spaceAbove = rect.top - MENU_GAP - MENU_VERTICAL_PADDING;

  const openUp = spaceBelow < desiredHeight && spaceAbove > spaceBelow;

  const availableHeight = Math.max(
    120,
    Math.min(MENU_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow)
  );

  const menuHeight = Math.min(desiredHeight, availableHeight);

  const width = Math.max(rect.width, MENU_MIN_WIDTH);

  const left = Math.min(
    Math.max(MENU_VERTICAL_PADDING, rect.left),
    viewportWidth - width - MENU_VERTICAL_PADDING
  );

  const top = openUp
    ? Math.max(MENU_VERTICAL_PADDING, rect.top - menuHeight - MENU_GAP)
    : Math.min(
        rect.bottom + MENU_GAP,
        viewportHeight - menuHeight - MENU_VERTICAL_PADDING
      );

  return {
    top,
    left,
    width,
    maxHeight: availableHeight,
    placement: openUp ? "top" : "bottom",
  };
};

export default function ChoiceCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
}) {
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);

  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);

  const options = normalizeOptions(column?.options);

  const isMultiple = Boolean(column?.multiple);

  const normalizedValue = useMemo(() => {
    if (isMultiple) {
      if (Array.isArray(value)) return value;

      if (value === null || value === undefined || value === "") {
        return [];
      }

      return [value];
    }

    return value || "";
  }, [isMultiple, value]);

  const selectedOptions = useMemo(() => {
    if (!isMultiple) return [];

    return options.filter((option) =>
      normalizedValue.includes(option.label)
    );
  }, [isMultiple, normalizedValue, options]);

  const selectedOption = useMemo(() => {
    if (isMultiple) return null;

    return options.find((option) => option.label === normalizedValue);
  }, [isMultiple, normalizedValue, options]);

  const updateMenuPosition = () => {
    const nextPosition = calculateMenuPosition(
      buttonRef.current,
      options.length
    );

    setMenuPosition(nextPosition);
  };

  useEffect(() => {
    const handleMouseDown = (event) => {
      const clickedButton = buttonRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);

      if (!clickedButton && !clickedMenu) {
        setIsChoiceOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  useEffect(() => {
    if (!isChoiceOpen) return;

    const handleReposition = () => {
      updateMenuPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isChoiceOpen, options.length]);

  const toggleMenu = () => {
    if (readOnly) return;

    if (isChoiceOpen) {
      setIsChoiceOpen(false);
      return;
    }

    setMenuPosition(calculateMenuPosition(buttonRef.current, options.length));
    setIsChoiceOpen(true);
  };

  const toggleMultipleOption = (optionLabel) => {
    const current = Array.isArray(normalizedValue)
      ? normalizedValue
      : [];

    const exists = current.includes(optionLabel);

    if (exists) {
      onChange?.(current.filter((item) => item !== optionLabel));
      return;
    }

    onChange?.([...current, optionLabel]);
  };

  const renderMultipleTags = () => {
    if (!selectedOptions.length) {
      return (
        <span style={{ color: "#64748b", fontSize: 13 }}>
          Не выбрано
        </span>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexWrap: "wrap",
        }}
      >
        {selectedOptions.map((option) => (
          <span
            key={option.id}
            style={{
              height: 22,
              padding: "0 9px",
              borderRadius: 999,
              background: option.color || DEFAULT_OPTION_COLOR,
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {option.label}
          </span>
        ))}
      </div>
    );
  };

  if (readOnly) {
    return (
      <div
        data-table-action="true"
        style={{
          width: "100%",
          minHeight: CELL_EDITOR_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent,
          padding: "2px 6px",
          boxSizing: "border-box",
        }}
      >
        {isMultiple ? (
          renderMultipleTags()
        ) : selectedOption ? (
          <span
            style={{
              height: 22,
              padding: "0 9px",
              borderRadius: 999,
              background:
                selectedOption.color || DEFAULT_OPTION_COLOR,
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {selectedOption.label}
          </span>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: 13 }}>
            —
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-table-action="true"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleMenu();
        }}
        style={{
          width: "100%",
          minHeight: CELL_EDITOR_HEIGHT,
          border: "none",
          borderRadius: 8,
          background: "transparent",
          padding: "2px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {isMultiple ? (
          renderMultipleTags()
        ) : selectedOption ? (
          <span
            style={{
              height: 22,
              padding: "0 9px",
              borderRadius: 999,
              background:
                selectedOption.color || DEFAULT_OPTION_COLOR,
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {selectedOption.label}
          </span>
        ) : (
          <span style={{ color: "#64748b", fontSize: 13 }}>
            Не выбрано
          </span>
        )}
      </button>

      {isChoiceOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            data-table-action="true"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              zIndex: 999999,
              background: "#ffffff",
              border: "1px solid #dbe3ef",
              borderRadius: 10,
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
              padding: 6,
              maxHeight: menuPosition.maxHeight,
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange?.(isMultiple ? [] : "");
                setIsChoiceOpen(false);
              }}
              style={{
                width: "100%",
                height: 28,
                border: "none",
                borderRadius: 7,
                background:
                  (!isMultiple && !normalizedValue) ||
                  (isMultiple && !normalizedValue.length)
                    ? "#f1f5f9"
                    : "transparent",
                padding: "0 8px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Не выбрано
            </button>

            {options.map((option) => {
              const isSelected = isMultiple
                ? normalizedValue.includes(option.label)
                : option.label === normalizedValue;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    if (isMultiple) {
                      toggleMultipleOption(option.label);
                      return;
                    }

                    onChange?.(option.label);
                    setIsChoiceOpen(false);
                  }}
                  style={{
                    width: "100%",
                    height: 30,
                    border: "none",
                    borderRadius: 7,
                    background: isSelected
                      ? "#f1f5f9"
                      : "transparent",
                    padding: "0 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          option.color || DEFAULT_OPTION_COLOR,
                        flexShrink: 0,
                      }}
                    />

                    <span>{option.label}</span>
                  </div>

                  {isSelected && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#0f172a",
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}