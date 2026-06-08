import { createRelation } from "../../../api/runtimeRelationsApi.js";
import { buildCreateEntityPayload } from "../../objectViews/entity/buildCreateEntityPayload.js";
import {
  formatRelationLinkFailuresMessage,
  submitPendingRelationLinks,
} from "../../objectViews/entity/submitPendingRelationLinks.js";
import { runtimeWriteGateway } from "../../runtimeWriteGateway/index.js";
import { resolveTargetObjectTypeKey } from "../utils/resolveTargetObjectTypeKey.js";
import {
  CREATE_RECORD_ACTION_TYPE,
  executeCreateRecordActionCore,
} from "./createRecordExecutorCore.js";
import { submitAutoLinkRelation } from "./submitAutoLinkRelation.js";

export { CREATE_RECORD_ACTION_TYPE };

/**
 * @param {{
 *   tenantId: number,
 *   objectTypeKey: string,
 *   action: Record<string, unknown> | null | undefined,
 *   formValues: Record<string, unknown>,
 *   fields?: Array<Record<string, unknown>>,
 *   sourceEntityId?: string | null,
 *   createEntity?: typeof runtimeWriteGateway.createEntity,
 *   submitRelationLinks?: typeof submitPendingRelationLinks,
 *   submitAutoLink?: typeof submitAutoLinkRelation,
 *   createRelationFn?: typeof createRelation,
 * }} params
 */
export async function executeCreateRecordAction({
  tenantId,
  objectTypeKey,
  action,
  formValues,
  fields = [],
  sourceEntityId = null,
  createEntity = runtimeWriteGateway.createEntity.bind(runtimeWriteGateway),
  submitRelationLinks = submitPendingRelationLinks,
  submitAutoLink = submitAutoLinkRelation,
  createRelationFn = createRelation,
}) {
  const targetObjectTypeKey = resolveTargetObjectTypeKey(action, objectTypeKey);

  return executeCreateRecordActionCore({
    tenantId,
    objectTypeKey: targetObjectTypeKey,
    action,
    formValues,
    fields,
    sourceEntityId,
    buildPayload: buildCreateEntityPayload,
    createEntity,
    submitRelationLinks,
    submitAutoLinkRelation: (params) =>
      submitAutoLink({
        ...params,
        createRelation: createRelationFn,
      }),
    formatRelationFailures: formatRelationLinkFailuresMessage,
  });
}
