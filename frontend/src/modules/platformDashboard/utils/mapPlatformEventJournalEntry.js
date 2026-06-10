import { formatJournalDate } from "./formatDateTime";
import {
  resolvePlatformEventStatusLabel,
  resolvePlatformEventTypeLabel,
} from "../constants/platformEventTypes";

export function mapJournalApiEntryToUi(entry) {
  if (!entry) {
    return null;
  }

  const createdAt = entry.occurred_at || entry.created_at;

  return {
    id: String(entry.id),
    dateLabel: formatJournalDate(createdAt),
    createdAt,
    eventType: resolvePlatformEventTypeLabel(entry.event_type),
    title: String(entry.title || "").trim() || "Событие",
    description: String(entry.description || "").trim(),
    statusLabel: resolvePlatformEventStatusLabel(entry.status),
    author: String(entry.author || "").trim() || "—",
  };
}

export function mapJournalApiEntriesToUi(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map(mapJournalApiEntryToUi).filter(Boolean);
}

export function sortJournalEntries(entries, direction = "desc") {
  const sorted = [...entries].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || "") || 0;
    const rightTime = Date.parse(right.createdAt || "") || 0;

    if (leftTime === rightTime) {
      return String(right.id).localeCompare(String(left.id));
    }

    return direction === "desc" ? rightTime - leftTime : leftTime - rightTime;
  });

  return sorted;
}
