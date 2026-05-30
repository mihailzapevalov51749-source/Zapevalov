const HISTORY_SORT_STORAGE_KEY = "platform-dashboard-history-sort";

export function readHistorySortDirection() {
  try {
    const value = localStorage.getItem(HISTORY_SORT_STORAGE_KEY);
    return value === "asc" ? "asc" : "desc";
  } catch {
    return "desc";
  }
}

export function writeHistorySortDirection(direction) {
  try {
    localStorage.setItem(HISTORY_SORT_STORAGE_KEY, direction);
  } catch {
    // ignore storage errors
  }
}

export function getNextHistorySortDirection(direction) {
  return direction === "desc" ? "asc" : "desc";
}

export function getHistorySortTitle(direction) {
  return direction === "desc" ? "От новых к старым" : "От старых к новым";
}
