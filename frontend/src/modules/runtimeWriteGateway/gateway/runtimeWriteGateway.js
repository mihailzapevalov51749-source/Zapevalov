import {
  createRuntimeEntity,
  updateRuntimeEntity,
} from "../api/runtimeEntitiesApi";

/**
 * Write gateway for Runtime Entity Layer (symmetric to runtimeReadGateway).
 */
export const runtimeWriteGateway = {
  /**
   * @param {{
   *   tenantId: number,
   *   objectTypeKey: string,
   *   values: Record<string, unknown>,
   * }} params
   */
  async createEntity({ tenantId, objectTypeKey, values }) {
    if (!tenantId) {
      throw new Error("tenantId is required for createEntity");
    }

    if (!objectTypeKey) {
      throw new Error("objectTypeKey is required for createEntity");
    }

    const response = await createRuntimeEntity(tenantId, objectTypeKey, {
      values: values && typeof values === "object" ? values : {},
    });

    return response;
  },

  /**
   * @param {{
   *   tenantId: number,
   *   objectTypeKey: string,
   *   entityId: string,
   *   values: Record<string, unknown>,
   * }} params
   */
  async updateEntity({ tenantId, objectTypeKey, entityId, values }) {
    if (!tenantId) {
      throw new Error("tenantId is required for updateEntity");
    }

    if (!objectTypeKey) {
      throw new Error("objectTypeKey is required for updateEntity");
    }

    if (!entityId) {
      throw new Error("entityId is required for updateEntity");
    }

    const response = await updateRuntimeEntity(
      tenantId,
      objectTypeKey,
      entityId,
      {
        values: values && typeof values === "object" ? values : {},
      },
    );

    return response;
  },
};
