import { formatSidebarActiveDuration } from "../../../../profile/activity/activityStatsHelpers";
import useTodayActiveTime from "../../../userActivity/useTodayActiveTime";

export default function SidebarTodayActiveTime({ collapsed = false }) {
  const activeSeconds = useTodayActiveTime();

  if (activeSeconds == null) {
    return null;
  }

  const label = formatSidebarActiveDuration(activeSeconds, { collapsed });
  const fullLabel = formatSidebarActiveDuration(activeSeconds);

  return (
    <div
      className="app-sidebar-today-active-time"
      aria-hidden="true"
      title={fullLabel}
    >
      <span className="app-sidebar-today-active-time__dot" />
      <span className="app-sidebar-today-active-time__label">{label}</span>
    </div>
  );
}
