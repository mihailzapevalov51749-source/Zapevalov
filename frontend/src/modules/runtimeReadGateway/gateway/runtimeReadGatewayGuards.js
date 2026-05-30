export const OBJECT_TYPE_KEY_REQUIRED = "OBJECT_TYPE_KEY_REQUIRED";

export function assertObjectTypeKey(objectTypeKey) {
  if (!objectTypeKey) {
    const error = new Error("objectTypeKey is required for query provider");
    error.code = OBJECT_TYPE_KEY_REQUIRED;
    throw error;
  }
}
