import { useEffect, useId, useRef, useState } from "react";

import {
  isValidHexColor,
  normalizeObjectTypeColor,
} from "./iconFileUtils";

const EMPTY_LABEL = "Не задано";

export default function ObjectTypeColorPicker({
  color,
  onChange,
  disabled = false,
}) {
  const nativeColorInputId = useId();
  const nativeColorInputRef = useRef(null);
  const [hexInput, setHexInput] = useState("");
  const [hexError, setHexError] = useState(false);

  const normalizedColor = normalizeObjectTypeColor(color);

  useEffect(() => {
    setHexInput(normalizedColor ? normalizedColor.slice(1) : "");
    setHexError(false);
  }, [normalizedColor]);

  const commitColor = (nextColor) => {
    const normalized = normalizeObjectTypeColor(nextColor);
    onChange?.(normalized);
    setHexError(false);
  };

  const handlePreviewClick = () => {
    if (disabled) {
      return;
    }
    nativeColorInputRef.current?.click();
  };

  const handleNativeColorChange = (event) => {
    commitColor(event.target.value);
  };

  const handleHexInputChange = (event) => {
    const next = event.target.value.replace(/[^0-9a-fA-F#]/g, "").slice(0, 7);
    setHexInput(next.replace(/^#/, ""));
    setHexError(false);

    if (!next) {
      onChange?.(null);
      return;
    }

    const candidate = next.startsWith("#") ? next : `#${next}`;
    if (isValidHexColor(candidate)) {
      commitColor(candidate);
    }
  };

  const handleHexBlur = () => {
    if (!hexInput.trim()) {
      onChange?.(null);
      setHexError(false);
      return;
    }

    const candidate = `#${hexInput.trim()}`;
    if (isValidHexColor(candidate)) {
      commitColor(candidate);
      return;
    }

    setHexError(true);
  };

  return (
    <div className="designer-object-general-control-row designer-object-type-color-picker">
      <button
        type="button"
        className={`designer-object-general-color-preview designer-object-type-color-picker__preview${
          normalizedColor ? "" : " is-empty"
        }`}
        style={normalizedColor ? { background: normalizedColor } : undefined}
        onClick={handlePreviewClick}
        disabled={disabled}
        title={normalizedColor ? "Изменить цвет иконки" : "Выбрать цвет иконки"}
        aria-label="Выбрать цвет иконки"
      />
      <input
        id={nativeColorInputId}
        ref={nativeColorInputRef}
        type="color"
        className="designer-object-type-color-picker__native"
        value={normalizedColor || "#2563EB"}
        onChange={handleNativeColorChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
      />
      <input
        className={`designer-input designer-object-type-color-picker__hex${
          hexError ? " is-invalid" : ""
        }`}
        value={hexInput ? `#${hexInput.toUpperCase()}` : ""}
        onChange={handleHexInputChange}
        onBlur={handleHexBlur}
        placeholder={EMPTY_LABEL}
        disabled={disabled}
        aria-invalid={hexError}
      />
    </div>
  );
}
