/**
 * Видимость названия в standalone/original Universal Table (table.settings).
 */
export function resolveTableShowTitle(table) {
  const settings = table?.settings || {};

  if (typeof settings.showTitle === "boolean") {
    return settings.showTitle;
  }

  return settings.show_title !== false;
}
