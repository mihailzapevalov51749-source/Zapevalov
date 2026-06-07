import { createRelationFieldLink } from "../../../api/runtimeRelationFieldsApi.js";
import { getApiErrorMessage } from "../../designer/api/platformApiClient.js";
import {
  formatRelationLinkFailuresMessage,
  submitPendingRelationLinksCore,
} from "./submitPendingRelationLinksCore.js";

export { formatRelationLinkFailuresMessage };

/**
 * Creates relation-field links after entity create (runtime relation-fields API).
 */
export async function submitPendingRelationLinks({
  tenantId,
  entityId,
  fields = [],
  formValues = {},
  createRelationFieldLink: createLink = createRelationFieldLink,
}) {
  return submitPendingRelationLinksCore({
    tenantId,
    entityId,
    fields,
    formValues,
    createRelationFieldLink: createLink,
    mapError: (error, fallback) => getApiErrorMessage(error, fallback),
  });
}
