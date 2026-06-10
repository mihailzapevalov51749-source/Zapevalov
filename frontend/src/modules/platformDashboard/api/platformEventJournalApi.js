import { platformApiClient } from "../../designer/api/platformApiClient";

const BASE_PATH = "/platform-event-journal";

export async function listPlatformEventJournalEntries() {
  const { data } = await platformApiClient.get(`${BASE_PATH}/entries`);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function createPlatformEventJournalEntry(payload) {
  const { data } = await platformApiClient.post(`${BASE_PATH}/entries`, payload);
  return data;
}
