import { PLAN_STATUS_DISPLAY, PLAN_STATUS_CATEGORY } from "./planStatusUtils.js";

const LEGEND_ORDER = [
  PLAN_STATUS_CATEGORY.NOT_STARTED,
  PLAN_STATUS_CATEGORY.IN_PROGRESS,
  PLAN_STATUS_CATEGORY.PAUSED,
  PLAN_STATUS_CATEGORY.COMPLETED,
  PLAN_STATUS_CATEGORY.OVERDUE,
];

export default function PlanStatusLegend() {
  return (
    <div className="object-plan-view__status-legend" aria-label="Легенда статусов">
      {LEGEND_ORDER.map((category) => {
        const display = PLAN_STATUS_DISPLAY[category];
        return (
          <span key={category} className="object-plan-view__status-legend-item">
            <span
              className="object-plan-view__status-legend-dot"
              style={{ color: display.color }}
            >
              ●
            </span>
            <span>{display.label}</span>
          </span>
        );
      })}
    </div>
  );
}
