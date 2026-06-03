/**
 * Раскрывающиеся строки настроек — паттерн ViewSettingsRows (Universal Tables reference).
 */
export default function ObjectTableViewSettingsRows({
  rows = [],
  expandedKey = null,
  onToggleExpanded,
}) {
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }

  return (
    <div className="ot-view-settings-panel__list">
      {rows.map((row, index) => {
        const isExpanded = expandedKey === row.key;
        const isLast = index === rows.length - 1;

        return (
          <div
            key={row.key}
            className={`ot-view-settings-panel__row-outer${isLast ? " is-last" : ""}`}
          >
            <button
              type="button"
              className={`ot-view-settings-panel__row-btn${isExpanded ? " is-expanded" : ""}`}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded?.(row.key);
              }}
            >
              <span className="ot-view-settings-panel__row-icon-wrap">
                <img
                  src={row.icon}
                  alt=""
                  className="ot-view-settings-panel__row-icon"
                  draggable={false}
                />
              </span>

              <span className="ot-view-settings-panel__row-text">
                <div className="ot-view-settings-panel__row-title">{row.title}</div>
                <div className="ot-view-settings-panel__row-desc">
                  {row.description}
                </div>
              </span>

              <span
                className={`ot-view-settings-panel__row-arrow${isExpanded ? " is-expanded" : ""}`}
              >
                ›
              </span>
            </button>

            {isExpanded ? (
              <div className="ot-view-settings-panel__row-details">
                {typeof row.renderContent === "function"
                  ? row.renderContent()
                  : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
