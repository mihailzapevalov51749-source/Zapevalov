import { formatJournalDate } from "./formatDateTime.js";
import {
  resolveJournalEntryCategoryLabel,
  resolveJournalEntryTypeLabel,
} from "../constants/tenantEventTypes.js";
import { resolvePlatformEventStatusLabel } from "../constants/platformEventTypes.js";

export function mapJournalApiEntryToUi(entry) {
  if (!entry) {
    return null;
  }

  const createdAt = entry.occurred_at || entry.created_at;
  const metadata = entry.metadata_json || entry.metadata || null;

  return {
    id: String(entry.id),
    dateLabel: formatJournalDate(createdAt),
    createdAt,
    eventTypeKey: String(entry.event_type || "").trim(),
    eventType: entry.event_type_label || resolveJournalEntryTypeLabel(entry),
    eventCategoryKey: String(entry.event_category || "system").trim().toLowerCase(),
    eventCategory: resolveJournalEntryCategoryLabel(entry),
    scope: String(entry.scope || "platform").trim().toLowerCase(),
    title: String(entry.title || "").trim() || "Событие",
    description: String(entry.description || "").trim(),
    statusLabel: entry.status_label || resolvePlatformEventStatusLabel(entry.status),
    statusKey: String(entry.status || "").trim().toLowerCase(),
    author: String(entry.author || "").trim() || "—",
    authorEmail: String(entry.actor_email || "").trim() || "—",
    targetType: String(entry.target_type || "").trim() || "—",
    targetId: entry.target_id != null ? String(entry.target_id) : "—",
    targetName: String(entry.target_name || "").trim() || "—",
    tenantId: entry.tenant_id != null ? String(entry.tenant_id) : "—",
    companyId: entry.company_id != null ? String(entry.company_id) : "—",
    metadata,
    metadataText: metadata ? JSON.stringify(metadata, null, 2) : "—",
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
