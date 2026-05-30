/** Canonical prefix for Runtime Entity business identity. */
export const ENTITY_REF_PREFIX_RUNTIME_ENTITY = "runtime_entity" as const;

/** Legacy prefix: universal_tables scope (storage container). */
export const ENTITY_REF_PREFIX_UNIVERSAL_TABLE = "universal_table" as const;

/** Legacy prefix: universal_table_rows scope (single row). */
export const ENTITY_REF_PREFIX_UNIVERSAL_TABLE_ROW = "universal_table_row" as const;

export const ENTITY_REF_SEPARATOR = ":" as const;

export const ENTITY_REF_PREFIXES = [
  ENTITY_REF_PREFIX_RUNTIME_ENTITY,
  ENTITY_REF_PREFIX_UNIVERSAL_TABLE,
  ENTITY_REF_PREFIX_UNIVERSAL_TABLE_ROW,
] as const;
