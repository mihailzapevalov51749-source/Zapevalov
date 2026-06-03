import { useState } from "react";
import { Ban } from "lucide-react";

import { getMenuColorTitle, MENU_COLORS } from "./menuColors";

import "./menuColorPicker.css";

/**
 * Platform menu color picker (same palette & UX as left navigation menu editor).
 */
export default function MenuColorPicker({
  color = "",
  onChange,
  disabled = false,
  allowEmpty = false,
  title = "Выбрать цвет",
}) {
  const [isOpen, setIsOpen] = useState(false);

  const palette = allowEmpty
    ? MENU_COLORS
    : MENU_COLORS.filter((item) => item !== "");

  const handleSelect = (nextColor) => {
    onChange?.(nextColor);
    setIsOpen(false);
  };

  return (
    <div className="menu-color-picker">
      <button
        type="button"
        className="menu-color-picker__current"
        onClick={() => {
          if (!disabled) {
            setIsOpen((value) => !value);
          }
        }}
        disabled={disabled}
        style={{
          background: color || "#ffffff",
          border: color ? "2px solid #ffffff" : "1px dashed #94a3b8",
        }}
        title={title}
        aria-label={title}
      >
        {!color && <Ban size={12} color="#64748b" />}
      </button>

      {isOpen ? (
        <div className="menu-color-picker__palette" role="listbox">
          {palette.map((paletteColor) => {
            const isActive = paletteColor === color;
            const isNoColor = paletteColor === "";
            const isWhite = paletteColor === "#ffffff";

            return (
              <button
                key={paletteColor || "no-color"}
                type="button"
                className="menu-color-picker__swatch"
                onClick={() => handleSelect(paletteColor)}
                style={{
                  background: paletteColor || "#ffffff",
                  border: isNoColor
                    ? "1px dashed #94a3b8"
                    : isWhite
                      ? "1px solid #cbd5e1"
                      : "none",
                  boxShadow: isActive
                    ? "0 0 0 2px #ffffff, 0 0 0 4px rgba(37,99,235,0.45)"
                    : "none",
                }}
                title={getMenuColorTitle(paletteColor)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
