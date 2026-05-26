import { getViewsByTable } from "../../universalTable/services/universalViewsApi";
import { mapLegacyViewToProjection } from "../mappers/legacyViewToRuntimeMapper";

export const legacyViewReadProvider = {
  async getProjection(params) {
    const { tenantId, objectTypeKey, viewKey = null, legacyTableId, warnings = [] } = params;

    if (!legacyTableId) {
      throw new Error("legacyTableId is required for legacy view fallback");
    }

    const viewsPayload = await getViewsByTable(legacyTableId);

    return mapLegacyViewToProjection({
      tenantId,
      objectTypeKey,
      viewKey,
      viewsPayload,
      warnings,
    });
  },
};
