/**
 * Resolves default Office user table view from API state.
 *
 * @param {{
 *   defaultViewKey?: string | null,
 *   defaultViewId?: string | null,
 *   views?: Array<{ id?: string, key?: string }>,
 * }} userState
 */
export function resolveOfficeDefaultViewKey(userState) {
  const views = Array.isArray(userState?.views) ? userState.views : [];
  const defaultKey = String(userState?.defaultViewKey || "").trim();
  const defaultId = String(userState?.defaultViewId || "").trim();

  if (defaultKey && views.some((view) => String(view.key) === defaultKey)) {
    return defaultKey;
  }

  if (defaultId) {
    const match = views.find((view) => String(view.id) === defaultId);

    if (match?.key) {
      return String(match.key);
    }
  }

  const flagged = views.find((view) => view.isDefault === true);

  return flagged?.key ? String(flagged.key) : null;
}
