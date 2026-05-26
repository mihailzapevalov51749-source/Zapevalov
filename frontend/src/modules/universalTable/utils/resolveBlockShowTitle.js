/**
 * Per-block видимость заголовка таблицы (block.settings.showTitle).
 * show_title оставлен только для обратной совместимости.
 */
export function resolveBlockShowTitle(block) {
  const settings = block?.settings || {};

  if (typeof settings.showTitle === "boolean") {
    return settings.showTitle;
  }

  return settings.show_title !== false;
}
