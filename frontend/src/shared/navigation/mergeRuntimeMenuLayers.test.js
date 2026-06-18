import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applySystemMenuSettingsToTree,
} from "./applySystemMenuSettingsToTree.js";
import {
  applyUserMenuPreferencesToTree,
  assignDistinctSortOrders,
  buildMovePreferencesPayload,
  buildMoveTenantSettingsPayload,
  mapKeyedSettingsToItemIds,
  resolveCanonicalTenantSettingsKeys,
  resolveMenuItemVisibility,
  resolveRuntimeMenuItemKey,
  sanitizeLegacyTenantSettingsForItems,
  sanitizeTenantSettingsByKey,
  sanitizeUserPreferencesByKey,
  tenantSettingsToItemMap,
  userPreferencesToItemMap,
} from "./mergeRuntimeMenuLayers.js";

describe("mergeRuntimeMenuLayers", () => {
  const baseMenu = [
    {
      id: 10,
      title: "Главная",
      system_key: "runtime.office_home",
      is_system: true,
      is_visible: true,
      sort_order: 0,
    },
    {
      id: 11,
      title: "Чат",
      system_key: "runtime.chat",
      is_system: true,
      is_visible: true,
      sort_order: 1,
    },
    {
      id: 12,
      title: "Календарь",
      system_key: "runtime.calendar",
      is_system: true,
      is_visible: true,
      sort_order: 2,
    },
    {
      id: 13,
      title: "Уведомления",
      system_key: "runtime.notifications",
      is_system: true,
      is_visible: true,
      sort_order: 3,
    },
    {
      id: 14,
      title: "Задачник",
      is_visible: true,
      sort_order: 4,
    },
  ];

  it("resolves runtime menu item keys from system_key", () => {
    assert.equal(resolveRuntimeMenuItemKey(baseMenu[0]), "runtime.office_home");
    assert.equal(resolveRuntimeMenuItemKey({ id: 55 }), "nav:55");
  });

  it("empty tenant settings does not hide base menu", () => {
    const mapped = tenantSettingsToItemMap(baseMenu, {});
    assert.deepEqual(mapped, {});

    const tree = applySystemMenuSettingsToTree(baseMenu, mapped);
    tree.forEach((item) => {
      assert.notEqual(item.is_visible, false, `item ${item.id} should stay visible`);
    });
  });

  it("empty user preferences does not hide base menu", () => {
    const prefs = userPreferencesToItemMap(baseMenu, {});
    const tree = applyUserMenuPreferencesToTree(baseMenu, {
      userPrefsByItemId: prefs,
      tenantSettingsByItemId: {},
    });

    tree.forEach((item) => {
      assert.notEqual(item.is_visible, false, `item ${item.id} should stay visible`);
    });
  });

  it("null or undefined visibility override does not hide items", () => {
    const mapped = tenantSettingsToItemMap(baseMenu, {
      "runtime.chat": { is_visible: null, sort_order: 5 },
      "runtime.calendar": { is_visible: undefined },
    });

    const tree = applySystemMenuSettingsToTree(baseMenu, mapped);
    assert.equal(tree[1].is_visible, true);
    assert.equal(tree[2].is_visible, true);
    assert.equal(tree[1].sort_order, 5);
  });

  it("tenant hidden item is hidden for everyone", () => {
    const tenantByItemId = tenantSettingsToItemMap(baseMenu, {
      "runtime.chat": { is_visible: false },
    });
    const tree = applySystemMenuSettingsToTree(baseMenu, tenantByItemId);
    assert.equal(tree[1].is_visible, false);
  });

  it("user hidden item is hidden only when tenant allows", () => {
    const tenantByItemId = tenantSettingsToItemMap(baseMenu, {});
    const userPrefs = userPreferencesToItemMap(baseMenu, {
      "runtime.calendar": { is_hidden: true },
    });

    const tree = applyUserMenuPreferencesToTree(baseMenu, {
      userPrefsByItemId: userPrefs,
      tenantSettingsByItemId: tenantByItemId,
    });

    assert.equal(tree[2].is_visible, false);
    assert.equal(tree[0].is_visible, true);
  });

  it("user cannot unhide tenant-hidden item", () => {
    const tenantByItemId = tenantSettingsToItemMap(baseMenu, {
      "runtime.chat": { is_visible: false },
    });
    const userPrefs = userPreferencesToItemMap(baseMenu, {
      "runtime.chat": { is_hidden: false },
    });

    const treeAfterTenant = applySystemMenuSettingsToTree(baseMenu, tenantByItemId);
    const tree = applyUserMenuPreferencesToTree(treeAfterTenant, {
      userPrefsByItemId: userPrefs,
      tenantSettingsByItemId: tenantByItemId,
    });

    assert.equal(tree[1].is_visible, false);
  });

  it("legacy localStorage orphan keys do not hide unknown items", () => {
    const sanitized = sanitizeLegacyTenantSettingsForItems(baseMenu, {
      999: { is_visible: false },
      11: { is_visible: false },
    });

    assert.equal(sanitized["runtime.chat"]?.is_visible, false);
    assert.equal(sanitized["runtime.office_home"], undefined);

    const tree = applySystemMenuSettingsToTree(
      baseMenu,
      mapKeyedSettingsToItemIds(baseMenu, sanitized),
    );

    assert.equal(tree[0].is_visible, true);
    assert.equal(tree[1].is_visible, false);
  });

  it("sanitize tenant settings ignores orphan keys", () => {
    const sanitized = sanitizeTenantSettingsByKey(baseMenu, {
      "runtime.chat": { is_visible: false },
      "runtime.unknown": { is_visible: false },
      "nav:777": { is_visible: false },
    });

    assert.equal(Object.keys(sanitized).length, 1);
    assert.equal(sanitized["runtime.chat"].is_visible, false);
  });

  it("sanitize user preferences ignores orphan keys", () => {
    const sanitized = sanitizeUserPreferencesByKey(baseMenu, {
      "runtime.notifications": { is_hidden: true },
      "runtime.unknown": { is_hidden: true },
    });

    assert.equal(Object.keys(sanitized).length, 1);
    assert.equal(sanitized["runtime.notifications"].is_hidden, true);
  });

  it("resolveMenuItemVisibility follows explicit semantics", () => {
    assert.equal(resolveMenuItemVisibility(true, undefined, undefined), true);
    assert.equal(resolveMenuItemVisibility(true, false, undefined), false);
    assert.equal(resolveMenuItemVisibility(true, true, true), false);
    assert.equal(resolveMenuItemVisibility(true, null, null), true);
  });

  it("new runtime item appears even if user has old orphan preferences", () => {
    const prefs = sanitizeUserPreferencesByKey(baseMenu, {
      "runtime.new_feature": { is_hidden: true },
    });
    const userPrefs = userPreferencesToItemMap(baseMenu, prefs);
    const tree = applyUserMenuPreferencesToTree(baseMenu, {
      userPrefsByItemId: userPrefs,
      tenantSettingsByItemId: {},
    });

    assert.equal(tree.length, baseMenu.length);
  });

  it("buildMovePreferencesPayload uses system_key not title", () => {
    const movePayload = [
      { id: 12, parent_id: null, block_id: 2, sort_order: 0 },
      { id: 13, parent_id: null, block_id: 2, sort_order: 1 },
    ];

    const preferences = buildMovePreferencesPayload(movePayload, baseMenu);

    assert.deepEqual(Object.keys(preferences).sort(), [
      "runtime.calendar",
      "runtime.notifications",
    ]);
    assert.equal(preferences["runtime.calendar"].sort_order, 0);
    assert.equal(preferences["runtime.notifications"].sort_order, 1);
    assert.equal(preferences["runtime.calendar"].navigation_item_id, 12);
  });

  it("buildMovePreferencesPayload writes personal_block_key for cross-block user move", () => {
    const movePayload = [
      { id: 12, parent_id: null, block_id: 3, sort_order: 0 },
    ];

    const preferences = buildMovePreferencesPayload(movePayload, baseMenu);

    assert.equal(preferences["runtime.calendar"].personal_block_key, "block:3");
    assert.equal(preferences["runtime.calendar"].block_id, undefined);
  });

  it("applyUserMenuPreferencesToTree applies personal block placement", () => {
    const userPrefs = userPreferencesToItemMap(baseMenu, {
      "runtime.calendar": { sort_order: 0, personal_block_key: "block:4" },
    });

    const tree = applyUserMenuPreferencesToTree(baseMenu, {
      userPrefsByItemId: userPrefs,
      tenantSettingsByItemId: {},
    });

    const calendar = tree.find((item) => item.system_key === "runtime.calendar");
    assert.equal(calendar.personal_block_id, 4);
  });

  it("personal block placement does not override tenant block for other users layer", async () => {
    const { organizeRootNavigationIntoBlocks } = await import("./navigationMenuBlocks.js");

    const tenantByItemId = tenantSettingsToItemMap(baseMenu, {
      "runtime.calendar": { block_id: 2, sort_order: 0 },
    });
    const userPrefs = userPreferencesToItemMap(baseMenu, {
      "runtime.calendar": { personal_block_key: "block:4", sort_order: 0 },
    });

    const withTenant = applySystemMenuSettingsToTree(baseMenu, tenantByItemId);
    const withUser = applyUserMenuPreferencesToTree(withTenant, {
      userPrefsByItemId: userPrefs,
      tenantSettingsByItemId: tenantByItemId,
    });

    const userBlocks = organizeRootNavigationIntoBlocks(withUser, tenantByItemId, {
      menuProfile: "platform",
    });

    assert.equal(userBlocks[3].some((item) => item.system_key === "runtime.calendar"), true);

    const tenantOnlyBlocks = organizeRootNavigationIntoBlocks(withTenant, tenantByItemId, {
      menuProfile: "platform",
    });

    assert.equal(tenantOnlyBlocks[1].some((item) => item.system_key === "runtime.calendar"), true);
  });

  it("reset semantics: empty user preferences restore tenant block structure", async () => {
    const { organizeRootNavigationIntoBlocks } = await import("./navigationMenuBlocks.js");

    const tenantByItemId = tenantSettingsToItemMap(baseMenu, {
      "runtime.calendar": { block_id: 2, sort_order: 0 },
    });
    const withTenant = applySystemMenuSettingsToTree(baseMenu, tenantByItemId);

    const tenantBlocks = organizeRootNavigationIntoBlocks(withTenant, tenantByItemId, {
      menuProfile: "platform",
    });

    const userPrefs = userPreferencesToItemMap(baseMenu, {
      "runtime.calendar": { personal_block_key: "block:4", sort_order: 0 },
    });
    const withUser = applyUserMenuPreferencesToTree(withTenant, {
      userPrefsByItemId: userPrefs,
      tenantSettingsByItemId: tenantByItemId,
    });
    const userBlocks = organizeRootNavigationIntoBlocks(withUser, tenantByItemId, {
      menuProfile: "platform",
    });

    assert.equal(userBlocks[3].some((item) => item.system_key === "runtime.calendar"), true);
    assert.equal(tenantBlocks[1].some((item) => item.system_key === "runtime.calendar"), true);
    assert.equal(userBlocks[1].some((item) => item.system_key === "runtime.calendar"), false);

    const afterReset = applyUserMenuPreferencesToTree(withTenant, {
      userPrefsByItemId: {},
      tenantSettingsByItemId: tenantByItemId,
    });
    const resetBlocks = organizeRootNavigationIntoBlocks(afterReset, tenantByItemId, {
      menuProfile: "platform",
    });

    assert.deepEqual(
      resetBlocks.map((block) => block.map((item) => item.system_key)),
      tenantBlocks.map((block) => block.map((item) => item.system_key)),
    );
  });

  it("applyMenuLayers sort order reflects user personal sort_order", async () => {
    const { sortNavigationTreeBySortOrder } = await import(
      "./applySystemMenuSettingsToTree.js"
    );

    const prefs = {
      "runtime.calendar": { sort_order: 0 },
      "runtime.notifications": { sort_order: 1 },
      "runtime.chat": { sort_order: 2 },
    };
    const userPrefs = userPreferencesToItemMap(baseMenu, prefs);
    const withUser = applyUserMenuPreferencesToTree(baseMenu, {
      userPrefsByItemId: userPrefs,
      tenantSettingsByItemId: {},
    });
    const sorted = sortNavigationTreeBySortOrder(withUser);

    assert.equal(sorted[0].system_key, "runtime.office_home");
    assert.equal(sorted[1].system_key, "runtime.calendar");
    assert.equal(sorted[2].system_key, "runtime.notifications");
    assert.equal(sorted[3].system_key, "runtime.chat");
  });

  it("object_type icon survives spurious tenant runtime menu settings", () => {
    const objectTypeMenu = [
      {
        id: 377,
        title: "Мои задачи",
        type: "object_type",
        object_type_id: "b88e93ca-client",
        display_icon_file_url: "/uploads/icons/462edaa34cbe49f08f42ce2999b26663.png",
        is_protected: true,
        is_visible: true,
      },
    ];

    const tenantByItemId = tenantSettingsToItemMap(objectTypeMenu, {
      "nav:377": {
        item_key: "nav:377",
        navigation_item_id: 377,
        icon_file_url: null,
        icon_type: null,
        title: null,
      },
    });

    assert.deepEqual(tenantByItemId, {});

    const tree = applySystemMenuSettingsToTree(objectTypeMenu, tenantByItemId);
    assert.equal(
      tree[0].display_icon_file_url,
      "/uploads/icons/462edaa34cbe49f08f42ce2999b26663.png",
    );
  });

  it("tenant-only menu assembly ignores user_menu_preferences", () => {
    const tenantByItemId = tenantSettingsToItemMap(baseMenu, {
      "runtime.chat": { sort_order: 1 },
      "runtime.calendar": { sort_order: 2 },
    });
    const withTenant = applySystemMenuSettingsToTree(baseMenu, tenantByItemId);

    const userPrefs = userPreferencesToItemMap(baseMenu, {
      "runtime.calendar": { is_hidden: true, sort_order: 0, personal_block_key: "block:4" },
      "runtime.chat": { sort_order: 99 },
    });
    const withUser = applyUserMenuPreferencesToTree(withTenant, {
      userPrefsByItemId: userPrefs,
      tenantSettingsByItemId: tenantByItemId,
    });

    assert.equal(withTenant.find((item) => item.system_key === "runtime.calendar")?.is_visible, true);
    assert.equal(withUser.find((item) => item.system_key === "runtime.calendar")?.is_visible, false);
    assert.equal(
      withTenant.find((item) => item.system_key === "runtime.chat")?.sort_order,
      1,
    );
    assert.equal(
      withUser.find((item) => item.system_key === "runtime.chat")?.sort_order,
      99,
    );
  });

  it("resolveCanonicalTenantSettingsKeys merges nav legacy alias into system_key", () => {
    const resolved = resolveCanonicalTenantSettingsKeys(baseMenu, {
      "nav:12": {
        item_key: "nav:12",
        sort_order: 30,
        icon_file_url: "/uploads/icons/legacy-calendar.png",
      },
      "runtime.calendar": {
        item_key: "runtime.calendar",
        sort_order: 0,
        icon_file_url: "/uploads/icons/calendar.png",
      },
    });

    assert.equal(Object.keys(resolved).length, 1);
    assert.equal(resolved["runtime.calendar"].sort_order, 30);
    assert.equal(resolved["runtime.calendar"].icon_file_url, "/uploads/icons/calendar.png");
  });

  it("assignDistinctSortOrders produces unique sort_order values", () => {
    const normalized = assignDistinctSortOrders([
      { id: 10, sort_order: 0, block_id: 1 },
      { id: 11, sort_order: 0, block_id: 1 },
      { id: 12, sort_order: 0, block_id: 1 },
    ]);

    const sortOrders = normalized.map((entry) => entry.sort_order);
    assert.deepEqual(sortOrders, [10, 20, 30]);
    assert.equal(new Set(sortOrders).size, sortOrders.length);
  });

  it("buildMoveTenantSettingsPayload writes distinct sort_order values", () => {
    const payload = buildMoveTenantSettingsPayload(
      [
        { id: 12, sort_order: 0, block_id: 1 },
        { id: 11, sort_order: 0, block_id: 1 },
      ],
      baseMenu,
    );

    assert.equal(payload["runtime.chat"].sort_order, 10);
    assert.equal(payload["runtime.calendar"].sort_order, 20);
  });
});
