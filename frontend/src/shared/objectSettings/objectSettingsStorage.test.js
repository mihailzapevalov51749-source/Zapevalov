import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildObjectSettingsLayoutStorageKey,
  clampSplitLeftWidth,
  clearObjectSettingsLayout,
  DEFAULT_MIN_LEFT_WIDTH_PX,
  DEFAULT_MIN_RIGHT_WIDTH_PX,
  getObjectSettingsLayout,
  OBJECT_SETTINGS_SPLIT_HANDLE_WIDTH,
  resolveDefaultSplitLeftWidth,
  saveObjectSettingsLayout,
} from "./objectSettingsStorage.js";

function maxLeftForContainer(containerWidth) {
  return (
    containerWidth -
    DEFAULT_MIN_RIGHT_WIDTH_PX -
    OBJECT_SETTINGS_SPLIT_HANDLE_WIDTH
  );
}

describe("objectSettingsStorage", () => {
  it("builds scoped storage key", () => {
    assert.equal(
      buildObjectSettingsLayoutStorageKey({
        tenantId: 1,
        objectTypeKey: "zadachnik",
        tabKey: "actions",
      }),
      "yasnopro-object-settings-layout::1::zadachnik::actions",
    );
  });

  it("clamps split width with symmetric min left and right constraints", () => {
    assert.equal(DEFAULT_MIN_LEFT_WIDTH_PX, DEFAULT_MIN_RIGHT_WIDTH_PX);

    // Case 3: leftWidth below minLeftWidth => minLeftWidth
    assert.equal(clampSplitLeftWidth(100, 1000), DEFAULT_MIN_LEFT_WIDTH_PX);

    // Case 2: containerWidth = 1000
    assert.equal(maxLeftForContainer(1000), 713);
    assert.equal(clampSplitLeftWidth(900, 1000), maxLeftForContainer(1000));
    assert.equal(clampSplitLeftWidth(350, 1000), 350);

    // Case 1: containerWidth = 1200
    assert.equal(maxLeftForContainer(1200), 913);
    assert.equal(clampSplitLeftWidth(1200, 1200), maxLeftForContainer(1200));

    // Case 4: leftWidth above maxLeft => maxLeft
    assert.equal(
      clampSplitLeftWidth(2000, 1000),
      maxLeftForContainer(1000),
    );
    assert.equal(
      clampSplitLeftWidth(2000, 1000),
      1000 - DEFAULT_MIN_RIGHT_WIDTH_PX - OBJECT_SETTINGS_SPLIT_HANDLE_WIDTH,
    );
  });

  it("restores and clears stored layout", () => {
    const containerWidth = 1000;
    const storageKey = buildObjectSettingsLayoutStorageKey({
      tenantId: 7,
      objectTypeKey: "istoriya",
      tabKey: "fields",
    });

    globalThis.localStorage = {
      storage: {},
      getItem(name) {
        return this.storage[name] ?? null;
      },
      setItem(name, value) {
        this.storage[name] = String(value);
      },
      removeItem(name) {
        delete this.storage[name];
      },
    };

    saveObjectSettingsLayout(storageKey, 420);
    assert.equal(getObjectSettingsLayout(storageKey, containerWidth), 420);

    saveObjectSettingsLayout(storageKey, 999);
    assert.equal(
      getObjectSettingsLayout(storageKey, containerWidth),
      maxLeftForContainer(containerWidth),
    );

    clearObjectSettingsLayout(storageKey);
    assert.equal(
      getObjectSettingsLayout(storageKey, containerWidth),
      resolveDefaultSplitLeftWidth(containerWidth),
    );
  });
});
