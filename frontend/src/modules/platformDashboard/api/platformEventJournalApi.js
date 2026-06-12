import { platformApiClient } from "../../designer/api/platformApiClient";

const PLATFORM_BASE_PATH = "/platform-event-journal";

function tenantBasePath(tenantId) {
  return `/designer/tenants/${tenantId}/event-journal`;
}

export async function listPlatformEventJournalEntries() {
  const { data } = await platformApiClient.get(`${PLATFORM_BASE_PATH}/entries`);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function listTenantEventJournalEntries(tenantId) {
  const { data } = await platformApiClient.get(`${tenantBasePath(tenantId)}/entries`);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function getPlatformEventJournalFilterOptions() {
  const { data } = await platformApiClient.get(`${PLATFORM_BASE_PATH}/filter-options`);
  return {
    categories: Array.isArray(data?.categories) ? data.categories : [],
    eventTypes: Array.isArray(data?.event_types) ? data.event_types : [],
  };
}

export async function getTenantEventJournalFilterOptions(tenantId) {
  const { data } = await platformApiClient.get(`${tenantBasePath(tenantId)}/filter-options`);
  return {
    categories: Array.isArray(data?.categories) ? data.categories : [],
    eventTypes: Array.isArray(data?.event_types) ? data.event_types : [],
  };
}

export async function createPlatformEventJournalEntry(payload) {
  const { data } = await platformApiClient.post(`${PLATFORM_BASE_PATH}/entries`, payload);
  return data;
}
