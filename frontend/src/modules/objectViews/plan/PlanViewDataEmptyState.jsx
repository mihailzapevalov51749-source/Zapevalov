import "./planViewEmptyState.css";
import {
  PLAN_DATA_EMPTY_HINT,
  PLAN_DATA_EMPTY_TITLE,
} from "./planEmptyStateMessages.js";

export default function PlanViewDataEmptyState({
  relationLabel = "связь",
  minHeight = 320,
}) {
  const label = String(relationLabel || "связь").trim() || "связь";

  return (
    <div
      className="object-plan-view object-plan-view--empty object-plan-view--empty-data"
      data-object-view-host="plan"
      data-plan-empty-state="data"
      style={{ minHeight }}
    >
      <div className="object-plan-view__empty">
        <h3 className="object-plan-view__empty-title">{PLAN_DATA_EMPTY_TITLE}</h3>
        <p className="object-plan-view__empty-text">{PLAN_DATA_EMPTY_HINT}</p>
      </div>
    </div>
  );
}
