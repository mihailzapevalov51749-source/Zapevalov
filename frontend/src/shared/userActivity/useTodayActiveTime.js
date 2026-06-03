import { useEffect, useState } from "react";

import { subscribeTodayActiveTime } from "./todayActiveTimeStore";

export default function useTodayActiveTime() {
  const [activeSeconds, setActiveSeconds] = useState(null);

  useEffect(() => subscribeTodayActiveTime(setActiveSeconds), []);

  return activeSeconds;
}
