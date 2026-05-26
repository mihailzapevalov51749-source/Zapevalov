import { isLegacyFallbackEnabled } from "../featureFlags/runtimeReadFlags";
import { legacyTableReadProvider } from "../providers/legacyTableReadProvider";
import { legacyViewReadProvider } from "../providers/legacyViewReadProvider";
import { queryReadProvider } from "../providers/queryReadProvider";
import { runtimeReadTelemetry } from "../telemetry/runtimeReadTelemetry";

function canUseLegacyFallback(params) {
  return isLegacyFallbackEnabled(params?.legacyFallback);
}

function buildFallbackWarning(providerName, reason) {
  return `Fallback to ${providerName}: ${reason || "unknown reason"}`;
}

export const runtimeReadGateway = {
  async getLegacyTable(tableId) {
    const response = await legacyTableReadProvider.getTableById(tableId);
    runtimeReadTelemetry.markLegacyFallbackRead();
    return response;
  },

  async getLegacyTableLookupSources() {
    const response = await legacyTableReadProvider.getLookupSources();
    runtimeReadTelemetry.markLegacyFallbackRead();
    return response;
  },

  async getObjectList(params) {
    const useLegacyFallback = canUseLegacyFallback(params);
    const hasObjectTypeKey = Boolean(params?.objectTypeKey);
    let queryError = null;

    if (hasObjectTypeKey) {
      try {
        const response = await queryReadProvider.getObjectList(params);
        runtimeReadTelemetry.markQueryRead();
        return response;
      } catch (error) {
        queryError = error;
        runtimeReadTelemetry.markError();
      }
    } else {
      queryError = new Error("objectTypeKey is required for query provider");
    }

    if (!useLegacyFallback) {
      throw queryError;
    }

    const reason = queryError?.message || "query unavailable";
    runtimeReadTelemetry.warnFallback({
      method: "getObjectList",
      from: "query",
      to: "legacy_table",
      reason,
    });

    try {
      const response = await legacyTableReadProvider.getObjectList({
        ...params,
        warnings: [buildFallbackWarning("legacy_table", reason)],
      });
      runtimeReadTelemetry.markLegacyFallbackRead();
      return response;
    } catch (fallbackError) {
      runtimeReadTelemetry.markError();
      throw fallbackError;
    }
  },

  async getProjection(params) {
    const useLegacyFallback = canUseLegacyFallback(params);
    const hasObjectTypeKey = Boolean(params?.objectTypeKey);
    let queryError = null;

    if (hasObjectTypeKey) {
      try {
        const response = await queryReadProvider.getProjection(params);
        runtimeReadTelemetry.markQueryRead();
        return response;
      } catch (error) {
        queryError = error;
        runtimeReadTelemetry.markError();
      }
    } else {
      queryError = new Error("objectTypeKey is required for query provider");
    }

    if (!useLegacyFallback) {
      throw queryError;
    }

    const reason = queryError?.message || "query projection unavailable";
    runtimeReadTelemetry.warnFallback({
      method: "getProjection",
      from: "query",
      to: "legacy_view",
      reason,
    });

    try {
      const response = await legacyViewReadProvider.getProjection({
        ...params,
        warnings: [buildFallbackWarning("legacy_view", reason)],
      });
      runtimeReadTelemetry.markLegacyFallbackRead();
      return response;
    } catch (fallbackError) {
      runtimeReadTelemetry.markError();
      throw fallbackError;
    }
  },
};
