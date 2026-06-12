import {
  resolvePlatformEventCategoryLabel,
  resolvePlatformEventTypeLabel,
} from "./platformEventTypes.js";
import {
  TENANT_EVENT_CATEGORY_LABELS,
  TENANT_EVENT_CODE_LABELS,
  TENANT_LEGACY_JOURNAL_TYPE_LABELS,
} from "./tenantEventAudit.js";

export function resolveTenantEventCategoryLabel(entry) {
  const fromApi = String(entry?.event_category_label || "").trim();
  if (fromApi) {
    return fromApi;
  }

  const category = String(entry?.event_category || "").trim().toLowerCase();
  if (category) {
    return TENANT_EVENT_CATEGORY_LABELS[category] || category;
  }

  return TENANT_EVENT_CATEGORY_LABELS.system;
}

export function resolveTenantEventTypeLabel(eventType, metadata = null) {
  const normalized = String(eventType || "").trim().toLowerCase();
  if (!normalized) {
    return "—";
  }

  if (normalized === "legacy") {
    const legacyType = metadata?.legacy_event_type;
    if (legacyType) {
      return TENANT_LEGACY_JOURNAL_TYPE_LABELS[legacyType] || legacyType;
    }
    return "legacy";
  }

  return (
    TENANT_EVENT_CODE_LABELS[normalized]
    || TENANT_LEGACY_JOURNAL_TYPE_LABELS[normalized]
    || normalized
  );
}

export function resolveJournalEntryCategoryLabel(entry) {
  const scope = String(entry?.scope || "platform").trim().toLowerCase();
  if (scope === "tenant") {
    return resolveTenantEventCategoryLabel(entry);
  }

  return resolvePlatformEventCategoryLabel(entry);
}

export function resolveJournalEntryTypeLabel(entry) {
  const scope = String(entry?.scope || "platform").trim().toLowerCase();
  const metadata = entry?.metadata_json || entry?.metadata || null;

  if (scope === "tenant") {
    return resolveTenantEventTypeLabel(entry?.event_type, metadata);
  }

  return resolvePlatformEventTypeLabel(entry?.event_type, metadata);
}
