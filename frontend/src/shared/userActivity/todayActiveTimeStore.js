import { getDailyActivityStats } from "../../api/userActivityApi";

const POLL_INTERVAL_MS = 60_000;

let started = false;
let pollTimer = null;
let activeSeconds = null;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(activeSeconds);
    } catch {
      // ignore subscriber errors
    }
  });
}

async function refreshTodayActiveTime() {
  const token = localStorage.getItem("token");
  if (!token) {
    activeSeconds = null;
    notify();
    return;
  }

  try {
    const dayStats = await getDailyActivityStats();
    activeSeconds = Math.max(0, Number(dayStats?.active_seconds) || 0);
  } catch {
    // Keep the last known value; sidebar indicator must not break the shell.
  }

  notify();
}

export function startTodayActiveTimePolling() {
  if (started || typeof window === "undefined") {
    return;
  }

  started = true;
  void refreshTodayActiveTime();

  pollTimer = window.setInterval(() => {
    void refreshTodayActiveTime();
  }, POLL_INTERVAL_MS);
}

export function stopTodayActiveTimePolling() {
  started = false;

  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }

  activeSeconds = null;
  notify();
}

export function subscribeTodayActiveTime(listener) {
  listeners.add(listener);
  listener(activeSeconds);

  return () => {
    listeners.delete(listener);
  };
}

export function getTodayActiveSecondsSnapshot() {
  return activeSeconds;
}
