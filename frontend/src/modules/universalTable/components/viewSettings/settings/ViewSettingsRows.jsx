import {
  settingsListStyle,
  settingsRowOuterStyle,
  settingsLastRowOuterStyle,
  settingsRowButtonStyle,
  settingsRowIconWrapperStyle,
  settingsRowTitleWrapperStyle,
  settingsRowTitleStyle,
  settingsRowDescriptionStyle,
  settingsRowArrowStyle,
  settingsDetailsWrapperStyle,
  settingsRowImageStyle,
} from "./viewSettingsStyles";

export default function ViewSettingsRows({
  rows = [],
  expandedKey = null,
  onToggleExpanded,
}) {
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }

  return (
    <div style={settingsListStyle}>
      {rows.map((row, index) => {
        const isExpanded = expandedKey === row.key;
        const isLast = index === rows.length - 1;

        return (
          <div
            key={row.key}
            style={
              isLast
                ? settingsLastRowOuterStyle
                : settingsRowOuterStyle
            }
          >
            <button
              type="button"
              onClick={() => onToggleExpanded?.(row.key)}
              style={{
                ...settingsRowButtonStyle,
                background: isExpanded
                  ? "#f8fbff"
                  : "#ffffff",
              }}
            >
              <div style={settingsRowIconWrapperStyle}>
                <img
                  src={row.icon}
                  alt=""
                  draggable={false}
                  style={settingsRowImageStyle}
                />
              </div>

              <div style={settingsRowTitleWrapperStyle}>
                <div style={settingsRowTitleStyle}>
                  {row.title}
                </div>

                <div style={settingsRowDescriptionStyle}>
                  {row.description}
                </div>
              </div>

              <div
                style={{
                  ...settingsRowArrowStyle,
                  transform: isExpanded
                    ? "rotate(90deg)"
                    : "none",
                }}
              >
                ›
              </div>
            </button>

            {isExpanded && (
              <div style={settingsDetailsWrapperStyle}>
                {typeof row.renderContent === "function"
                  ? row.renderContent()
                  : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}