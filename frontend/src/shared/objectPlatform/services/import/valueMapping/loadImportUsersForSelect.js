import { getUsers } from "../../../../../api/authApi.js";
import { loadImportUsersIndex } from "../loadImportUsersIndex.js";
import { getUserMappingOptions } from "./resolveImportValueCandidates.js";

/**
 * @returns {Promise<{
 *   index: { byEmail: Map<string, number[]>, byName: Map<string, number[]> },
 *   options: Array<{ value: number, label: string }>,
 *   items: Array<Record<string, unknown>>,
 * }>}
 */
export async function loadImportUsersForSelect() {
  const data = await getUsers();
  const items = Array.isArray(data) ? data : data?.items || [];
  const index = await loadImportUsersIndex();

  return {
    index,
    options: getUserMappingOptions(items),
    items,
  };
}
