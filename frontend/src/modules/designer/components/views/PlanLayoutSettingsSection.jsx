import { useMemo } from "react";

import {
  canHidePlanTab,
  normalizePlanLayoutSettings,
  reorderPlanLayoutItems,
  togglePlanLayoutItemShowInInfo,
  togglePlanLayoutItemVisibility,
  updatePlanLayoutItemLabel,
  updatePlanLayoutTabs,
} from "../../../objectViews/plan/planLayoutSettings.js";
import PlanLayoutOrderList from "./PlanLayoutOrderList.jsx";

export default function PlanLayoutSettingsSection({
  planLayout = null,
  onChange,
}) {
  const layout = useMemo(() => normalizePlanLayoutSettings(planLayout), [planLayout]);

  const updateLayout = (nextLayout) => {
    onChange?.(nextLayout);
  };

  const handleToggleTab = (tabKey) => {
    if (!canHidePlanTab(layout, tabKey) && layout.tabs.find((tab) => tab.key === tabKey)?.visible !== false) {
      return;
    }

    updateLayout(
      updatePlanLayoutTabs(layout, togglePlanLayoutItemVisibility(layout.tabs, tabKey)),
    );
  };

  const handleReorderTabs = (sourceKey, targetKey, position) => {
    updateLayout(
      updatePlanLayoutTabs(
        layout,
        reorderPlanLayoutItems(layout.tabs, sourceKey, targetKey, position),
      ),
    );
  };

  const handleTabLabelChange = (tabKey, label) => {
    updateLayout(
      updatePlanLayoutTabs(layout, updatePlanLayoutItemLabel(layout.tabs, tabKey, label)),
    );
  };

  const handleToggleShowInInfo = (tabKey) => {
    if (tabKey === "info") {
      return;
    }

    updateLayout(
      updatePlanLayoutTabs(layout, togglePlanLayoutItemShowInInfo(layout.tabs, tabKey)),
    );
  };

  return (
    <div className="designer-plan-layout-settings">
      <PlanLayoutOrderList
        title="Вкладки"
        items={layout.tabs}
        onToggleVisible={handleToggleTab}
        onReorder={handleReorderTabs}
        onLabelChange={handleTabLabelChange}
        canToggleVisible={(tabKey) => canHidePlanTab(layout, tabKey)}
        showInInfoColumn
        onToggleShowInInfo={handleToggleShowInInfo}
        canToggleShowInInfo={(tabKey) => tabKey !== "info"}
      />
    </div>
  );
}
