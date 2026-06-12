import { useState } from "react";

import UserActivityModal from "../../../../profile/components/UserActivityModal";
import { formatSidebarActiveDuration } from "../../../../profile/activity/activityStatsHelpers";
import useTodayActiveTime from "../../../userActivity/useTodayActiveTime";

export default function SidebarTodayActiveTime({ collapsed = false }) {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const activeSeconds = useTodayActiveTime();

  if (activeSeconds == null) {
    return null;
  }

  const label = formatSidebarActiveDuration(activeSeconds, { collapsed });
  const durationTitle = formatSidebarActiveDuration(activeSeconds);

  return (
    <>
      <button
        type="button"
        className="app-sidebar-today-active-time"
        title="Посмотреть активность"
        aria-label={`Посмотреть активность. Сегодня: ${durationTitle}`}
        onClick={() => setIsActivityModalOpen(true)}
      >
        <span className="app-sidebar-today-active-time__dot" aria-hidden="true" />
        <span className="app-sidebar-today-active-time__label">{label}</span>
      </button>

      <UserActivityModal
        open={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
      />
    </>
  );
}
