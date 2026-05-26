/**
 * Возвращает id Universal Table, привязанный к блоку (без fallback на block.id).
 */
export function resolveBlockTableId(block) {
  if (!block) return null;

  const candidates = [
    block?.content?.table_id,
    block?.content?.tableId,
    block?.settings?.table_id,
    block?.settings?.tableId,
    block?.table_id,
    block?.tableId,
    block?.config?.table_id,
    block?.config?.tableId,
  ];

  for (const value of candidates) {
    if (value === null || value === undefined || value === "") continue;
    const normalized = Number(value);
    if (!Number.isNaN(normalized) && normalized > 0) {
      return normalized;
    }
  }

  return null;
}
