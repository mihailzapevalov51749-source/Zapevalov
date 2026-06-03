import { normalizeObjectViewDefinition } from "../../services/normalizeObjectViewDefinition";
import {
  attachUserViewMeta,
  userViewRecordToRawView,
} from "./objectTableUserViewsStorage";

function applyUserDefaultFlags(views, defaultViewKey) {
  if (!defaultViewKey) {
    return views;
  }

  const hasUserDefault = views.some(
    (item) =>
      item.contract?.meta?.isUserView === true &&
      item.contract?.key === defaultViewKey,
  );

  return views.map((item) => {
    const isUser = item.contract?.meta?.isUserView === true;
    const key = item.contract?.key;

    let isDefault = false;

    if (defaultViewKey === key) {
      isDefault = true;
    } else if (!hasUserDefault && item.contract?.meta?.isDefault === true) {
      isDefault = true;
    }

    return {
      ...item,
      contract: {
        ...item.contract,
        meta: {
          ...item.contract.meta,
          isDefault,
        },
      },
    };
  });
}

/**
 * Merges published (system) table views with per-user Office views.
 *
 * @param {unknown[]} publishedRawViews
 * @param {ReturnType<import('./objectTableUserViewsStorage').loadUserTableViewsState>} userState
 * @param {{ pageSize?: number }} [options]
 */
export function mergePublishedAndUserTableViews(
  publishedRawViews,
  userState,
  { pageSize = 20 } = {},
) {
  const userViews = Array.isArray(userState?.views) ? userState.views : [];
  const userDefaultKey = userState?.defaultViewKey || null;

  const user = userViews.map((record) => {
    const raw = userViewRecordToRawView(record);
    const contract = normalizeObjectViewDefinition(raw, {
      viewKey: record.key,
      pageSize,
      isPublished: true,
    });

    return {
      raw,
      contract: attachUserViewMeta(
        {
          ...contract,
          key: record.key,
          name: record.name,
          meta: {
            ...contract.meta,
            isDefault: Boolean(record.isDefault),
            isSystem: false,
          },
        },
        { userViewId: record.id },
      ),
    };
  });

  return applyUserDefaultFlags(user, userDefaultKey);
}
