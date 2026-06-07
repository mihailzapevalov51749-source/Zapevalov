import { getEntityCardLayoutFields } from "../entity/getEntityCardLayoutFields.js";

import { resolvePlanInfoFieldKeys } from "./resolvePlanProjectionFields.js";



/**

 * Fields for Plan Info tab — order follows projection.infoFieldKeys.

 *

 * @param {{

 *   catalog?: Record<string, unknown> | null,

 *   objectTypeKey?: string | null,

 *   projection?: { fieldKeys?: string[], fieldOrder?: string[], infoFieldKeys?: string[], titleFieldKey?: string | null } | null,

 * }} params

 */

export function resolvePlanInfoDisplayFields({

  catalog = null,

  objectTypeKey = null,

  projection = null,

}) {

  const layoutFields = getEntityCardLayoutFields(catalog, objectTypeKey);

  const orderedInfoKeys = resolvePlanInfoFieldKeys(projection);



  const fieldByKey = new Map(

    layoutFields

      .map((field) => [String(field?.key || "").trim(), field])

      .filter(([key]) => Boolean(key)),

  );



  return orderedInfoKeys

    .map((key) => fieldByKey.get(key))

    .filter(Boolean);

}

