import { queryReadProvider } from "../providers/queryReadProvider.js";
import { runtimeReadTelemetry } from "../telemetry/runtimeReadTelemetry.js";
import {
  OBJECT_TYPE_KEY_REQUIRED,
  assertObjectTypeKey,
} from "./runtimeReadGatewayGuards.js";

export const runtimeReadGateway = {
  async getObjectList(params = {}) {
    assertObjectTypeKey(params?.objectTypeKey);

    try {
      const response = await queryReadProvider.getObjectList(params);
      runtimeReadTelemetry.markQueryRead();
      return response;
    } catch (error) {
      runtimeReadTelemetry.markError();
      throw error;
    }
  },

  async getProjection(params = {}) {
    assertObjectTypeKey(params?.objectTypeKey);

    try {
      const response = await queryReadProvider.getProjection(params);
      runtimeReadTelemetry.markQueryRead();
      return response;
    } catch (error) {
      runtimeReadTelemetry.markError();
      throw error;
    }
  },
};

export { OBJECT_TYPE_KEY_REQUIRED };
