import { useState } from "react";

import {
  entityCardSystemInfoPanelStyle,
  entityCardSystemInfoRowLabelStyle,
  entityCardSystemInfoRowStyle,
  entityCardSystemInfoRowValueStyle,
  entityCardSystemInfoToggleStyle,
} from "./styles/entityCardHeroHeaderStyles";

export default function EntityCardSystemInfo({
  rows = [],
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!rows.length) {
    return null;
  }

  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        style={entityCardSystemInfoToggleStyle}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Скрыть системную информацию" : "Системная информация"}
      </button>

      {open ? (
        <div style={entityCardSystemInfoPanelStyle}>
          {rows.map((row) => (
            <div key={row.key} style={entityCardSystemInfoRowStyle}>
              <span style={entityCardSystemInfoRowLabelStyle}>{row.label}</span>
              <span style={entityCardSystemInfoRowValueStyle}>
                {row.value}
                {row.copyable ? (
                  <button
                    type="button"
                    style={{
                      marginLeft: 8,
                      border: "none",
                      background: "transparent",
                      color: "#2563eb",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onClick={() => {
                      void navigator.clipboard?.writeText(String(row.value));
                    }}
                  >
                    Копировать
                  </button>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
