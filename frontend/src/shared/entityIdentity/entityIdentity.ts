import {
  ENTITY_REF_PREFIX_RUNTIME_ENTITY,
  ENTITY_REF_PREFIX_UNIVERSAL_TABLE,
  ENTITY_REF_PREFIX_UNIVERSAL_TABLE_ROW,
  ENTITY_REF_PREFIXES,
  ENTITY_REF_SEPARATOR,
} from "./entityIdentity.constants";
import type {
  EntityRefKind,
  EntityRefParseResult,
  KnownEntityRefKind,
} from "./entityIdentity.types";

function normalizeToRefString(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return null;
}

function isKnownEntityRefKind(prefix: string): prefix is KnownEntityRefKind {
  return (ENTITY_REF_PREFIXES as readonly string[]).includes(prefix);
}

/**
 * Build canonical entity ref: runtime_entity:{uuid}
 */
export function formatRuntimeEntityRef(entityId: string): string {
  const id = String(entityId ?? "").trim();
  return `${ENTITY_REF_PREFIX_RUNTIME_ENTITY}${ENTITY_REF_SEPARATOR}${id}`;
}

/**
 * Tolerant parse of entity ref strings (prefix:id).
 * Does not validate UUID shape — format only.
 */
export function parseEntityRef(value: unknown): EntityRefParseResult {
  const raw = normalizeToRefString(value);

  if (raw == null) {
    return { ok: false, kind: "unknown", raw: null };
  }

  const separatorIndex = raw.indexOf(ENTITY_REF_SEPARATOR);

  if (separatorIndex <= 0 || separatorIndex === raw.length - 1) {
    return { ok: false, kind: "unknown", raw };
  }

  const prefix = raw.slice(0, separatorIndex);
  const id = raw.slice(separatorIndex + 1).trim();

  if (!id || !isKnownEntityRefKind(prefix)) {
    return { ok: false, kind: "unknown", raw };
  }

  return { ok: true, kind: prefix, id, raw };
}

export function isRuntimeEntityRef(value: unknown): boolean {
  const parsed = parseEntityRef(value);
  return parsed.ok && parsed.kind === ENTITY_REF_PREFIX_RUNTIME_ENTITY;
}

export function isLegacyEntityRef(value: unknown): boolean {
  const parsed = parseEntityRef(value);
  return (
    parsed.ok &&
    (parsed.kind === ENTITY_REF_PREFIX_UNIVERSAL_TABLE ||
      parsed.kind === ENTITY_REF_PREFIX_UNIVERSAL_TABLE_ROW)
  );
}

export function isLegacyUniversalTableRef(value: unknown): boolean {
  const parsed = parseEntityRef(value);
  return parsed.ok && parsed.kind === ENTITY_REF_PREFIX_UNIVERSAL_TABLE;
}

export function getEntityRefKind(value: unknown): EntityRefKind {
  const parsed = parseEntityRef(value);
  return parsed.ok ? parsed.kind : "unknown";
}
