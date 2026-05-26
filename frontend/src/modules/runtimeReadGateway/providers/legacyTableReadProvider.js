import { getLookupSources, getTable } from "../../universalTable/services/tableApi";
import { mapLegacyTableToObjectList } from "../mappers/legacyTableToRuntimeMapper";

export const legacyTableReadProvider = {
  async getTableById(tableId) {
    return getTable(tableId);
  },

  async getLookupSources() {
    const sources = await getLookupSources();
    return Array.isArray(sources) ? sources : [];
  },

  async getObjectList(params) {
    const {
      tenantId,
      objectTypeKey,
      viewKey = null,
      limit = 20,
      offset = 0,
      legacyTableId,
      warnings = [],
    } = params;

    if (!legacyTableId) {
      throw new Error("legacyTableId is required for legacy table fallback");
    }

    const tablePayload = await getTable(legacyTableId);

    return mapLegacyTableToObjectList({
      tenantId,
      objectTypeKey,
      viewKey,
      tablePayload,
      limit,
      offset,
      warnings,
    });
  },
};
