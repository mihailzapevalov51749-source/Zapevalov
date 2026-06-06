/**
 * Resolves hierarchy / position number shown in Title Field (not record_number).
 *
 * @param {Record<string, unknown> | null | undefined} row
 * @param {{ hierarchyTreeEnabled?: boolean }} [options]
 */
export function resolveTitleFieldDisplayNumber(
  row,
  { hierarchyTreeEnabled = false } = {},
) {
  if (hierarchyTreeEnabled) {
    const hierarchyNumber = String(row?.hierarchy?.hierarchyNumber ?? "").trim();

    if (hierarchyNumber) {
      return hierarchyNumber;
    }
  }

  return String(row?.positionNumber ?? row?.displayPosition ?? "").trim();
}
