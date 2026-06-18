const EVENT_TYPE_COLORS = {
  meeting: "#0078D4",
  conference: "#5C2D91",
  deadline: "#D13438",
  reminder: "#CA5010",
  checkpoint: "#498205",
  video_meeting: "#0078D4",
  standup: "#038387",
  contractor_meeting: "#8764B8",
  doc_review: "#004578",
  site_visit: "#498205",
  deadline_control: "#D13438",
  milestone_delivery: "#107C10",
};

const DEFAULT_EVENT_COLOR = "#0078D4";

export function getEventAccentColor(eventType) {
  return EVENT_TYPE_COLORS[eventType] || DEFAULT_EVENT_COLOR;
}

export function getEventCardStyle(eventType, { selected = false, compact = false } = {}) {
  const accent = getEventAccentColor(eventType);

  return {
    borderLeft: `3px solid ${accent}`,
    background: selected ? "#DEECF9" : `${accent}18`,
    color: "#201F1E",
    minHeight: compact ? 20 : 24,
    padding: compact ? "1px 6px 1px 4px" : "2px 8px 2px 4px",
    borderRadius: 2,
    fontSize: compact ? 11 : 12,
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    boxSizing: "border-box",
    borderTop: "none",
    borderRight: "none",
    borderBottom: "none",
  };
}
