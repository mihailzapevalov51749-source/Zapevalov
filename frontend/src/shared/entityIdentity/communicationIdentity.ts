import { ENTITY_REF_PREFIX_RUNTIME_ENTITY } from "./entityIdentity.constants";

/** Backend storage value for comments / notes / attachments (object-centric writes). */
export const COMMUNICATION_ENTITY_TYPE_RUNTIME_ENTITY =
  ENTITY_REF_PREFIX_RUNTIME_ENTITY;

export type CommunicationBackendIdentity = {
  entityType: string;
  entityId: string;
};

/**
 * API payload identity for a Runtime Entity instance.
 * Canonical frontend ref remains `runtime_entity:{uuid}` via formatRuntimeEntityRef.
 */
export function resolveRuntimeEntityCommunicationIdentity(
  runtimeEntityId: unknown,
): CommunicationBackendIdentity | null {
  const entityId = String(runtimeEntityId ?? "").trim();

  if (!entityId) {
    return null;
  }

  return {
    entityType: COMMUNICATION_ENTITY_TYPE_RUNTIME_ENTITY,
    entityId,
  };
}

export function isRuntimeEntityCommunicationType(entityType: unknown): boolean {
  return (
    String(entityType ?? "").trim() === COMMUNICATION_ENTITY_TYPE_RUNTIME_ENTITY
  );
}

/**
 * Legacy comments storage: entity_type = `universal_table:{tableId}`, entity_id = rowId.
 */
export function parseLegacyUniversalTableCommunicationType(
  entityType: unknown,
): { tableId: string } | null {
  const normalized = String(entityType ?? "").trim();

  if (!normalized.startsWith("universal_table:")) {
    return null;
  }

  const tableId = normalized.slice("universal_table:".length).trim();

  if (!tableId) {
    return null;
  }

  return { tableId };
}
