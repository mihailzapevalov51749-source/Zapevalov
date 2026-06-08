import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  OBJECT_SETTINGS_SPLIT_HANDLE_WIDTH,
} from "../../../shared/objectSettings/objectSettingsStorage.js";
import {
  buildObjectActionsLayoutStorageKey,
  clampLeftPanelWidth,
  DEFAULT_LEFT_PANEL_RATIO,
  MIN_LEFT_PANEL_WIDTH_PX,
  MIN_RIGHT_PANEL_WIDTH_PX,
  resolveDefaultLeftPanelWidth,
  resolveInitialLeftPanelWidth,
  saveStoredLeftPanelWidth,
} from "./objectActionsLayoutStorage.js";

function maxLeftForContainer(containerWidth) {
  return containerWidth - MIN_RIGHT_PANEL_WIDTH_PX - OBJECT_SETTINGS_SPLIT_HANDLE_WIDTH;
}

describe("objectActionsLayoutStorage", () => {
  it("builds stable scoped storage key", () => {
    assert.equal(
      buildObjectActionsLayoutStorageKey(1, "zadachnik"),
      "yasnopro-object-settings-layout::1::zadachnik::actions",
    );
  });

  it("clamps left width between min left and min right panel width", () => {
    const containerWidth = 1000;

    assert.equal(clampLeftPanelWidth(100, containerWidth), 280);
    assert.equal(
      clampLeftPanelWidth(100, containerWidth),
      MIN_LEFT_PANEL_WIDTH_PX,
    );
    assert.equal(
      clampLeftPanelWidth(900, containerWidth),
      maxLeftForContainer(containerWidth),
    );
    assert.equal(
      clampLeftPanelWidth(350, containerWidth),
      350,
    );
  });

  it("respects minimum right panel width", () => {
    const containerWidth =
      MIN_LEFT_PANEL_WIDTH_PX + MIN_RIGHT_PANEL_WIDTH_PX + OBJECT_SETTINGS_SPLIT_HANDLE_WIDTH;

    assert.equal(
      clampLeftPanelWidth(999, containerWidth),
      MIN_LEFT_PANEL_WIDTH_PX,
    );
  });

  it("uses 30% default when nothing stored", () => {
    const containerWidth = 1000;

    assert.equal(
      resolveDefaultLeftPanelWidth(containerWidth),
      Math.floor(containerWidth * DEFAULT_LEFT_PANEL_RATIO),
    );
    assert.equal(resolveInitialLeftPanelWidth(containerWidth, 99, "test-object"), 300);
  });

  it("restores stored width with clamping", () => {
    const containerWidth = 1000;
    const key = buildObjectActionsLayoutStorageKey(7, "istoriya");

    globalThis.localStorage = {
      storage: {},
      getItem(name) {
        return this.storage[name] ?? null;
      },
      setItem(name, value) {
        this.storage[name] = String(value);
      },
    };

    saveStoredLeftPanelWidth(7, "istoriya", 420);
    assert.equal(
      resolveInitialLeftPanelWidth(containerWidth, 7, "istoriya"),
      420,
    );

    saveStoredLeftPanelWidth(7, "istoriya", 999);
    assert.equal(
      resolveInitialLeftPanelWidth(containerWidth, 7, "istoriya"),
      maxLeftForContainer(containerWidth),
    );

    assert.equal(globalThis.localStorage.getItem(key), "999");
  });
});
