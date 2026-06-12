import assert from "node:assert/strict";
import test from "node:test";

import {
  filterPlatformEventJournalEntries,
  formatJournalDateFilterLabel,
  JOURNAL_EVENT_TYPE_ALL,
  JOURNAL_SORT_NEWEST,
  JOURNAL_SORT_OLDEST,
  matchesJournalDateFilter,
  matchesJournalSearchQuery,
  normalizeJournalDateRange,
  resolveJournalSelectedEntryId,
} from "./filterPlatformEventJournalEntries.js";

const SAMPLE_ENTRIES = [
  {
    id: "3",
    title: "Унифицированы модалки Control Plane",
    description: "PlatformModal для Control Plane",
    eventTypeKey: "architecture",
    eventType: "Архитектурное решение",
    author: "Cursor",
    createdAt: "2026-06-10T12:00:00Z",
  },
  {
    id: "2",
    title: "Исправлена структура пространства Компании",
    description: "Вкладка Клиенты",
    eventTypeKey: "fix",
    eventType: "Исправление",
    author: "Cursor",
    createdAt: "2026-06-05T09:30:00Z",
  },
  {
    id: "1",
    title: "Аудит Control Plane",
    description: "Независимость Control Plane",
    eventTypeKey: "audit",
    eventType: "Аудит",
    author: "Cursor",
    createdAt: "2026-06-01T08:00:00Z",
  },
];

test("search matches title, description, type and author", () => {
  assert.equal(
    matchesJournalSearchQuery(SAMPLE_ENTRIES[0], "control plane"),
    true,
  );
  assert.equal(
    matchesJournalSearchQuery(SAMPLE_ENTRIES[0], "platformmodal"),
    true,
  );
  assert.equal(matchesJournalSearchQuery(SAMPLE_ENTRIES[0], "cursor"), true);
  assert.equal(
    matchesJournalSearchQuery(SAMPLE_ENTRIES[0], "архитектурное"),
    true,
  );
  assert.equal(matchesJournalSearchQuery(SAMPLE_ENTRIES[0], "demo"), false);
});

test("filters by event type", () => {
  const filtered = filterPlatformEventJournalEntries(SAMPLE_ENTRIES, {
    eventTypeKey: "architecture",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "3");
});

test("filters by single date", () => {
  const filtered = filterPlatformEventJournalEntries(SAMPLE_ENTRIES, {
    dateFilter: { start: "2026-06-10", end: null },
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "3");
});

test("filters by date range inclusively", () => {
  const filtered = filterPlatformEventJournalEntries(SAMPLE_ENTRIES, {
    dateFilter: { start: "2026-06-01", end: "2026-06-10" },
  });

  assert.deepEqual(
    filtered.map((entry) => entry.id),
    ["3", "2", "1"],
  );
});

test("normalizes reversed date range selection", () => {
  const next = normalizeJournalDateRange("2026-06-01", {
    start: "2026-06-10",
    end: null,
  });

  assert.deepEqual(next, { start: "2026-06-01", end: "2026-06-10" });
  assert.equal(
    matchesJournalDateFilter(SAMPLE_ENTRIES[1], next),
    true,
  );
});

test("formats single date and range labels", () => {
  assert.equal(
    formatJournalDateFilterLabel({ start: "2026-06-10", end: null }),
    "10.06.2026",
  );
  assert.equal(
    formatJournalDateFilterLabel({ start: "2026-06-01", end: "2026-06-10" }),
    "01.06.2026 — 10.06.2026",
  );
});

test("third click resets completed range to a new single day", () => {
  const next = normalizeJournalDateRange("2026-06-18", {
    start: "2026-06-05",
    end: "2026-06-12",
  });

  assert.deepEqual(next, { start: "2026-06-18", end: null });
});

test("sorts oldest first", () => {
  const filtered = filterPlatformEventJournalEntries(SAMPLE_ENTRIES, {
    eventTypeKey: JOURNAL_EVENT_TYPE_ALL,
    sortDirection: JOURNAL_SORT_OLDEST,
  });

  assert.deepEqual(
    filtered.map((entry) => entry.id),
    ["1", "2", "3"],
  );
});

test("sorts newest first by default", () => {
  const filtered = filterPlatformEventJournalEntries(SAMPLE_ENTRIES, {
    sortDirection: JOURNAL_SORT_NEWEST,
  });

  assert.deepEqual(
    filtered.map((entry) => entry.id),
    ["3", "2", "1"],
  );
});

test("resolveJournalSelectedEntryId keeps valid selection or picks first", () => {
  assert.equal(resolveJournalSelectedEntryId(SAMPLE_ENTRIES, "2"), "2");
  assert.equal(resolveJournalSelectedEntryId([SAMPLE_ENTRIES[0]], "2"), "3");
  assert.equal(resolveJournalSelectedEntryId([], "2"), null);
});
