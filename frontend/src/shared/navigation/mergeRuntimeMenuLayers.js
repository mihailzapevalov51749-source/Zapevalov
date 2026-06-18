import {
  formatPersonalBlockKey,
  parsePersonalBlockKey,
} from "./navigationMenuBlocks.js";
import { sanitizeNavigationMenuSettingRecord } from "./navigationMenuIconPolicy.js";

export const MENU_SORT_ORDER_STEP = 10;

const NAV_LEGACY_KEY_RE = /^nav:(\d+)$/i;

export function parseNavLegacyKey(itemKey) {
  const match = NAV_LEGACY_KEY_RE.exec(String(itemKey || "").trim());
  return match ? match[1] : null;
}

export function buildNavAliasMapFromNavigationItems(items = []) {
  const aliasByNavId = new Map();

  flattenNavigationItems(items).forEach((item) => {
    const systemKey = String(item?.system_key || "").trim();
    const itemId = String(item?.id ?? "").trim();
    if (!systemKey || !/^\d+$/.test(itemId)) {
      return;
    }
    aliasByNavId.set(itemId, systemKey);
  });

  return aliasByNavId;
}

export function resolveCanonicalMenuItemKey(itemKey, aliasByNavId = new Map()) {
  const normalized = String(itemKey || "").trim();
  if (!normalized) {
    return normalized;
  }

  const navId = parseNavLegacyKey(normalized);
  if (!navId) {
    return normalized;
  }

  return aliasByNavId.get(navId) || normalized;
}

function hasMeaningfulSettingValue(field, value) {
  if (value == null) {
    return false;
  }
  if (field === "icon_file_url" || field === "title" || field === "color") {
    return Boolean(String(value).trim());
  }
  if (typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  return true;
}

const TENANT_SETTING_MERGE_FIELDS = [
  "navigation_item_id",
  "title",
  "icon",
  "icon_type",
  "icon_file_url",
  "color",
  "sort_order",
  "is_visible",
  "is_bold",
  "is_italic",
  "is_expanded",
  "block_id",
];

export function mergeTenantSettingRecords(primary, secondary, { canonicalKey } = {}) {
  const merged = {};

  if (canonicalKey) {
    merged.item_key = canonicalKey;
  }

  TENANT_SETTING_MERGE_FIELDS.forEach((field) => {
    const primaryValue = primary?.[field];
    const secondaryValue = secondary?.[field];

    if (field === "sort_order") {
      if (
        typeof primaryValue === "number"
        && typeof secondaryValue === "number"
        && primaryValue === 0
        && secondaryValue !== 0
      ) {
        merged[field] = secondaryValue;
        return;
      }
    }

    if (hasMeaningfulSettingValue(field, primaryValue)) {
      merged[field] = primaryValue;
    } else if (hasMeaningfulSettingValue(field, secondaryValue)) {
      merged[field] = secondaryValue;
    }
  });

  if (primary?.updated_at) {
    merged.updated_at = primary.updated_at;
  } else if (secondary?.updated_at) {
    merged.updated_at = secondary.updated_at;
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

export function resolveCanonicalTenantSettingsKeys(navigationItems = [], settingsByKey = {}) {
  if (!settingsByKey || typeof settingsByKey !== "object") {
    return {};
  }

  const aliasByNavId = buildNavAliasMapFromNavigationItems(navigationItems);
  const grouped = new Map();

  Object.entries(settingsByKey).forEach(([rawKey, record]) => {
    const canonicalKey = resolveCanonicalMenuItemKey(rawKey, aliasByNavId);
    const navId = parseNavLegacyKey(rawKey);
    const isLegacyAlias = navId && canonicalKey !== rawKey;
    const bucket = grouped.get(canonicalKey) || { canonical: null, legacy: null };

    if (isLegacyAlias) {
      bucket.legacy = record;
    } else {
      bucket.canonical = record;
    }

    grouped.set(canonicalKey, bucket);
  });

  const resolved = {};

  grouped.forEach((bucket, canonicalKey) => {
    const merged = mergeTenantSettingRecords(bucket.canonical, bucket.legacy, {
      canonicalKey,
    });
    if (merged) {
      resolved[canonicalKey] = merged;
    }
  });

  return resolved;
}

export function mergeTenantSettingsState(current = {}, incoming = {}) {
  return {
    ...(current && typeof current === "object" ? current : {}),
    ...(incoming && typeof incoming === "object" ? incoming : {}),
  };
}

export function assignDistinctSortOrders(itemsPayload = [], step = MENU_SORT_ORDER_STEP) {
  if (!Array.isArray(itemsPayload) || itemsPayload.length === 0) {
    return [];
  }

  const buckets = new Map();

  itemsPayload.forEach((entry) => {
    const blockKey =
      typeof entry?.block_id === "number" && Number.isFinite(entry.block_id)
        ? `block:${entry.block_id}`
        : "root";

    if (!buckets.has(blockKey)) {
      buckets.set(blockKey, []);
    }
    buckets.get(blockKey).push(entry);
  });

  const normalized = [];

  buckets.forEach((entries) => {
    const sorted = [...entries].sort((left, right) => {
      const leftOrder = Number(left?.sort_order ?? 0);
      const rightOrder = Number(right?.sort_order ?? 0);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
    });

    sorted.forEach((entry, index) => {
      normalized.push({
        ...entry,
        sort_order: (index + 1) * step,
      });
    });
  });

  return normalized;
}

export function resolveRuntimeMenuItemKey(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const systemKey = String(item.system_key || "").trim();
  if (systemKey) {
    return systemKey;
  }

  const id = String(item.id ?? "").trim();
  if (/^\d+$/.test(id)) {
    return `nav:${id}`;
  }

  return id || null;
}

export function isExplicitBoolean(value) {
  return value === true || value === false;
}

export function sanitizeTenantSettingRecord(value) {
  return sanitizeNavigationMenuSettingRecord(value);
}

export function sanitizeUserPreferenceRecord(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const sanitized = {};

  if (typeof value.sort_order === "number" && Number.isFinite(value.sort_order)) {
    sanitized.sort_order = value.sort_order;
  }
  if (isExplicitBoolean(value.is_hidden)) {
    sanitized.is_hidden = value.is_hidden;
  }
  if (typeof value.color === "string" && value.color.trim()) {
    sanitized.color = value.color.trim();
  }
  if (isExplicitBoolean(value.is_bold)) {
    sanitized.is_bold = value.is_bold;
  }
  if (isExplicitBoolean(value.is_collapsed)) {
    sanitized.is_collapsed = value.is_collapsed;
  }
  if (typeof value.personal_block_key === "string" && value.personal_block_key.trim()) {
    const parsedBlockId = parsePersonalBlockKey(value.personal_block_key.trim());
    if (parsedBlockId != null) {
      sanitized.personal_block_key = formatPersonalBlockKey(parsedBlockId);
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export function sanitizeLegacyTenantSettingsForItems(items = [], legacyByItemId = {}) {
  const sanitized = {};

  flattenNavigationItems(items).forEach((item) => {
    const itemId = String(item.id ?? "").trim();
    if (!itemId) {
      return;
    }

    const itemKey = resolveRuntimeMenuItemKey(item);
    if (!itemKey) {
      return;
    }

    const legacyRecord = legacyByItemId[itemId];
    const normalized = sanitizeTenantSettingRecord(legacyRecord);
    if (normalized) {
      sanitized[itemKey] = normalized;
    }
  });

  return sanitized;
}

export function sanitizeTenantSettingsByKey(items = [], tenantSettingsByKey = {}) {
  const sanitized = {};

  Object.entries(tenantSettingsByKey || {}).forEach(([key, value]) => {
    const normalized = sanitizeTenantSettingRecord(value);
    if (!normalized) {
      return;
    }

    const matchesCurrentItem = flattenNavigationItems(items).some((item) => {
      const itemKey = resolveRuntimeMenuItemKey(item);
      const itemId = String(item.id ?? "").trim();
      return itemKey === key || itemId === key || itemKey === `nav:${key}`;
    });

    if (!matchesCurrentItem) {
      return;
    }

    sanitized[key] = normalized;
  });

  return sanitized;
}

export function sanitizeUserPreferencesByKey(items = [], userPreferencesByKey = {}) {
  const sanitized = {};

  Object.entries(userPreferencesByKey || {}).forEach(([key, value]) => {
    const normalized = sanitizeUserPreferenceRecord(value);
    if (!normalized) {
      return;
    }

    const matchesCurrentItem = flattenNavigationItems(items).some((item) => {
      const itemKey = resolveRuntimeMenuItemKey(item);
      const itemId = String(item.id ?? "").trim();
      return itemKey === key || itemId === key || itemKey === `nav:${key}`;
    });

    if (!matchesCurrentItem) {
      return;
    }

    sanitized[key] = normalized;
  });

  return sanitized;
}

export function resolveMenuItemVisibility(baseVisible, tenantOverride, userHidden) {
  const baseIsVisible = baseVisible !== false;

  if (tenantOverride === false) {
    return false;
  }

  if (tenantOverride === true) {
    if (userHidden === true) {
      return false;
    }
    return true;
  }

  if (userHidden === true) {
    return false;
  }

  return baseIsVisible;
}

export function flattenNavigationItems(items = [], acc = []) {
  (Array.isArray(items) ? items : []).forEach((item) => {
    acc.push(item);
    if (Array.isArray(item?.children) && item.children.length) {
      flattenNavigationItems(item.children, acc);
    }
  });
  return acc;
}

export function mapKeyedSettingsToItemIds(items = [], settingsByKey = {}) {
  const mapped = {};
  const resolvedSettings = resolveCanonicalTenantSettingsKeys(items, settingsByKey);

  flattenNavigationItems(items).forEach((item) => {
    const itemKey = resolveRuntimeMenuItemKey(item);
    const itemId = String(item.id ?? "").trim();
    if (!itemId) {
      return;
    }

    const rawSettings =
      (itemKey && resolvedSettings[itemKey]) ||
      resolvedSettings[itemId] ||
      resolvedSettings[`nav:${itemId}`] ||
      null;

    const settings = sanitizeTenantSettingRecord(rawSettings);
    if (settings) {
      mapped[itemId] = settings;
    }
  });

  return mapped;
}

export function tenantSettingsToItemMap(items = [], tenantSettingsByKey = {}) {
  const resolvedByKey = resolveCanonicalTenantSettingsKeys(items, tenantSettingsByKey);
  const sanitizedByKey = sanitizeTenantSettingsByKey(items, resolvedByKey);
  return mapKeyedSettingsToItemIds(items, sanitizedByKey);
}

export function userPreferencesToItemMap(items = [], userPreferencesByKey = {}) {
  const mapped = {};

  flattenNavigationItems(items).forEach((item) => {
    const itemKey = resolveRuntimeMenuItemKey(item);
    const itemId = String(item.id ?? "").trim();
    if (!itemId) {
      return;
    }

    const rawPreference =
      (itemKey && userPreferencesByKey[itemKey]) ||
      userPreferencesByKey[itemId] ||
      userPreferencesByKey[`nav:${itemId}`] ||
      null;

    const preference = sanitizeUserPreferenceRecord(rawPreference);
    if (preference) {
      mapped[itemId] = preference;
    }
  });

  return mapped;
}

export function applyUserMenuPreferencesToTree(
  tree = [],
  {
    userPrefsByItemId = {},
    tenantSettingsByItemId = {},
  } = {},
) {
  if (!Array.isArray(tree) || tree.length === 0) {
    return [];
  }

  return tree.map((item) => {
    const itemId = String(item.id ?? "").trim();
    const tenantSettings = tenantSettingsByItemId[itemId] || {};
    const userPref = userPrefsByItemId[itemId] || {};

    const children = Array.isArray(item.children)
      ? applyUserMenuPreferencesToTree(item.children, {
          userPrefsByItemId,
          tenantSettingsByItemId,
        })
      : item.children;

    let nextItem = { ...item, children };

    nextItem.is_visible = resolveMenuItemVisibility(
      item.is_visible,
      tenantSettings.is_visible,
      userPref.is_hidden,
    );

    if (typeof userPref.sort_order === "number" && Number.isFinite(userPref.sort_order)) {
      nextItem = { ...nextItem, sort_order: userPref.sort_order };
    }

    if (typeof userPref.color === "string" && userPref.color.trim()) {
      nextItem = { ...nextItem, color: userPref.color.trim() };
    }

    if (typeof userPref.is_bold === "boolean") {
      nextItem = { ...nextItem, is_bold: userPref.is_bold };
    }

    if (typeof userPref.is_collapsed === "boolean") {
      nextItem = { ...nextItem, is_expanded: !userPref.is_collapsed };
    }

    if (typeof userPref.personal_block_key === "string" && userPref.personal_block_key.trim()) {
      const personalBlockId = parsePersonalBlockKey(userPref.personal_block_key.trim());
      if (personalBlockId != null) {
        nextItem = { ...nextItem, personal_block_id: personalBlockId };
      }
    }

    return nextItem;
  });
}

export function buildTenantMenuSettingPayload(item, data = {}) {
  const itemKey = resolveRuntimeMenuItemKey(item);
  if (!itemKey) {
    return null;
  }

  const navigationItemId = /^\d+$/.test(String(item.id ?? ""))
    ? Number(item.id)
    : null;

  return {
    itemKey,
    payload: {
      navigation_item_id: navigationItemId,
      title: typeof data.title === "string" ? data.title : undefined,
      icon_file_url:
        "icon_file_url" in data
          ? String(data.icon_file_url || "").trim() || null
          : undefined,
      color: typeof data.color === "string" ? data.color : undefined,
      is_bold: typeof data.is_bold === "boolean" ? data.is_bold : undefined,
      is_italic: typeof data.is_italic === "boolean" ? data.is_italic : undefined,
      is_visible: typeof data.is_visible === "boolean" ? data.is_visible : undefined,
      is_expanded: typeof data.is_expanded === "boolean" ? data.is_expanded : undefined,
      sort_order:
        typeof data.sort_order === "number" && Number.isFinite(data.sort_order)
          ? data.sort_order
          : undefined,
      block_id:
        typeof data.block_id === "number" && Number.isFinite(data.block_id)
          ? data.block_id
          : undefined,
    },
  };
}

export function buildUserMenuPreferencePayload(item, data = {}) {
  const itemKey = resolveRuntimeMenuItemKey(item);
  if (!itemKey) {
    return null;
  }

  const navigationItemId = /^\d+$/.test(String(item.id ?? ""))
    ? Number(item.id)
    : null;

  return {
    itemKey,
    payload: {
      navigation_item_id: navigationItemId,
      sort_order:
        typeof data.sort_order === "number" && Number.isFinite(data.sort_order)
          ? data.sort_order
          : undefined,
      is_hidden: typeof data.is_hidden === "boolean" ? data.is_hidden : undefined,
      color: typeof data.color === "string" ? data.color : undefined,
      is_bold: typeof data.is_bold === "boolean" ? data.is_bold : undefined,
      is_collapsed:
        typeof data.is_collapsed === "boolean" ? data.is_collapsed : undefined,
      personal_block_key:
        typeof data.personal_block_key === "string" && data.personal_block_key.trim()
          ? data.personal_block_key.trim()
          : formatPersonalBlockKey(data.block_id),
    },
  };
}

export function buildMovePreferencesPayload(items = [], rootItems = []) {
  const rootById = new Map(
    (Array.isArray(rootItems) ? rootItems : []).map((item) => [String(item.id), item]),
  );
  const preferences = {};

  (Array.isArray(items) ? items : []).forEach((entry) => {
    const item = rootById.get(String(entry?.id ?? ""));
    if (!item) {
      return;
    }

    const built = buildUserMenuPreferencePayload(item, {
      sort_order: entry.sort_order,
      block_id: entry.block_id,
    });

    if (built?.itemKey) {
      preferences[built.itemKey] = built.payload;
    }
  });

  return preferences;
}

export function buildMoveTenantSettingsPayload(items = [], rootItems = []) {
  const rootById = new Map(
    (Array.isArray(rootItems) ? rootItems : []).map((item) => [String(item.id), item]),
  );
  const settings = {};
  const normalizedItems = assignDistinctSortOrders(items);

  normalizedItems.forEach((entry) => {
    const item = rootById.get(String(entry?.id ?? ""));
    if (!item) {
      return;
    }

    const built = buildTenantMenuSettingPayload(item, {
      sort_order: entry.sort_order,
      block_id: entry.block_id,
      parent_id: entry.parent_id,
    });

    if (built?.itemKey) {
      settings[built.itemKey] = built.payload;
    }
  });

  return settings;
}
