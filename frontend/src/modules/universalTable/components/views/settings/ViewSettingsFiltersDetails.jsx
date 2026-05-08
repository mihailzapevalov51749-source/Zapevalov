import {
  getConditionsCount,
  getFilterPreview,
} from "../helpers/tableRepresentationViewUtils";

import {
  settingsFilterDetailsStyle,
  settingsFilterPreviewListStyle,
  settingsOpenFilterButtonStyle,
  settingsDetailRowStyle,
} from "./viewSettingsStyles";

export default function ViewSettingsFiltersDetails({
  representation,
  columns = [],
  onOpenRepresentationFilters,
}) {
  const details = getFilterPreview(representation, columns);
  const hasFilters = getConditionsCount(representation) > 0;

  return (
    <div style={settingsFilterDetailsStyle}>
      <div style={settingsFilterPreviewListStyle}>
        {details.map((detail, index) => (
          <div key={`filter_detail_${index}`} style={settingsDetailRowStyle}>
            {detail}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();

          onOpenRepresentationFilters?.(representation);
        }}
        style={settingsOpenFilterButtonStyle}
      >
        {hasFilters ? "Открыть фильтры" : "Настроить фильтры"}
      </button>
    </div>
  );
}