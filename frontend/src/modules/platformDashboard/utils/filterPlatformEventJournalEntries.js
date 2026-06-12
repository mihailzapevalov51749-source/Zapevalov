import { parseApiDateTime } from "./formatDateTime.js";
import { sortJournalEntries } from "./mapPlatformEventJournalEntry.js";

export const JOURNAL_SORT_NEWEST = "desc";
export const JOURNAL_SORT_OLDEST = "asc";

export const JOURNAL_EVENT_TYPE_ALL = "all";
export const JOURNAL_EVENT_CATEGORY_ALL = "all";

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function toLocalDateKey(value) {
  const date = parseApiDateTime(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatJournalDateFilterLabel(dateFilter) {
  if (!dateFilter?.start) {
    return "";
  }

  const formatIso = (isoDate) => {
    const [year, month, day] = String(isoDate).split("-");
    if (!year || !month || !day) {
      return isoDate;
    }
    return `${day}.${month}.${year}`;
  };

  if (!dateFilter.end || dateFilter.end === dateFilter.start) {
    return formatIso(dateFilter.start);
  }

  const startIso =
    dateFilter.start <= dateFilter.end ? dateFilter.start : dateFilter.end;
  const endIso =
    dateFilter.start <= dateFilter.end ? dateFilter.end : dateFilter.start;

  return `${formatIso(startIso)} — ${formatIso(endIso)}`;
}

export function normalizeJournalDateRange(nextDate, currentFilter) {
  const isoDate = String(nextDate || "").trim();

  if (!isoDate) {
    return currentFilter;
  }

  // Complete range already selected — third click starts a new single-day selection.
  if (currentFilter?.start && currentFilter.end) {
    return { start: isoDate, end: null };
  }

  // First click — single day until a second date is chosen.
  if (!currentFilter?.start) {
    return { start: isoDate, end: null };
  }

  if (isoDate === currentFilter.start) {
    return { start: isoDate, end: null };
  }

  if (isoDate < currentFilter.start) {
    return { start: isoDate, end: currentFilter.start };
  }

  return { start: currentFilter.start, end: isoDate };
}

export function matchesJournalSearchQuery(entry, query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    entry.title,
    entry.description,
    entry.eventType,
    entry.eventCategory,
    entry.author,
    entry.authorEmail,
    entry.targetName,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return haystack.includes(normalizedQuery);
}

export function matchesJournalEventType(entry, eventTypeKey) {
  if (!eventTypeKey || eventTypeKey === JOURNAL_EVENT_TYPE_ALL) {
    return true;
  }

  return String(entry.eventTypeKey || "") === String(eventTypeKey);
}

export function matchesJournalEventCategory(entry, eventCategoryKey) {
  if (!eventCategoryKey || eventCategoryKey === JOURNAL_EVENT_CATEGORY_ALL) {
    return true;
  }

  return String(entry.eventCategoryKey || "system") === String(eventCategoryKey);
}

export function matchesJournalDateFilter(entry, dateFilter) {
  if (!dateFilter?.start) {
    return true;
  }

  const entryDateKey = toLocalDateKey(entry.createdAt);

  if (!entryDateKey) {
    return false;
  }

  if (!dateFilter.end || dateFilter.end === dateFilter.start) {
    return entryDateKey === dateFilter.start;
  }

  const startKey =
    dateFilter.start <= dateFilter.end ? dateFilter.start : dateFilter.end;
  const endKey =
    dateFilter.start <= dateFilter.end ? dateFilter.end : dateFilter.start;

  return entryDateKey >= startKey && entryDateKey <= endKey;
}

export function filterPlatformEventJournalEntries(
  entries,
  {
    searchQuery = "",
    eventTypeKey = JOURNAL_EVENT_TYPE_ALL,
    eventCategoryKey = JOURNAL_EVENT_CATEGORY_ALL,
    dateFilter = null,
    sortDirection = JOURNAL_SORT_NEWEST,
  } = {},
) {
  const filtered = (Array.isArray(entries) ? entries : []).filter(
    (entry) =>
      matchesJournalSearchQuery(entry, searchQuery)
      && matchesJournalEventType(entry, eventTypeKey)
      && matchesJournalEventCategory(entry, eventCategoryKey)
      && matchesJournalDateFilter(entry, dateFilter),
  );

  return sortJournalEntries(filtered, sortDirection);
}

export function resolveJournalSelectedEntryId(entries, previousEntryId) {
  if (
    previousEntryId != null
    && entries.some((entry) => entry.id === previousEntryId)
  ) {
    return previousEntryId;
  }

  return entries[0]?.id ?? null;
}
