import type {
  ENTITY_REF_PREFIX_RUNTIME_ENTITY,
  ENTITY_REF_PREFIX_UNIVERSAL_TABLE,
  ENTITY_REF_PREFIX_UNIVERSAL_TABLE_ROW,
} from "./entityIdentity.constants";

/** Parsed entity reference kind (platform contract). */
export type EntityRefKind =
  | typeof ENTITY_REF_PREFIX_RUNTIME_ENTITY
  | typeof ENTITY_REF_PREFIX_UNIVERSAL_TABLE
  | typeof ENTITY_REF_PREFIX_UNIVERSAL_TABLE_ROW
  | "unknown";

export type KnownEntityRefKind = Exclude<EntityRefKind, "unknown">;

export type EntityRefParseSuccess = {
  ok: true;
  kind: KnownEntityRefKind;
  id: string;
  raw: string;
};

export type EntityRefParseFailure = {
  ok: false;
  kind: "unknown";
  raw: string | null;
};

export type EntityRefParseResult = EntityRefParseSuccess | EntityRefParseFailure;
