import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isPlatformNavigationTarget,
  shouldCloseFloatingOnOutsideClick,
} from "./workspace/yasiiFloatingDismiss.js";

function createElement(tagName, className) {
  return {
    tagName: tagName.toUpperCase(),
    className,
    contains() {
      return false;
    },
    closest(selector) {
      if (!className) {
        return null;
      }

      const selectors = selector.split(",").map((item) => item.trim());

      for (const candidate of selectors) {
        if (candidate.startsWith(".") && className.includes(candidate.slice(1))) {
          return this;
        }
      }

      return null;
    },
  };
}

describe("yasii floating dismiss", () => {
  it("does not close when pinned", () => {
    const target = createElement("div", "page-content");

    assert.equal(
      shouldCloseFloatingOnOutsideClick(target, {
        panelElement: null,
        buttonElement: null,
        isPinned: true,
      }),
      false,
    );
  });

  it("does not close on platform navigation chrome", () => {
    const target = createElement("button", "app-sidebar-renderer--runtime menu-item");

    assert.equal(isPlatformNavigationTarget(target), true);
    assert.equal(
      shouldCloseFloatingOnOutsideClick(target, {
        panelElement: null,
        buttonElement: null,
        isPinned: false,
      }),
      false,
    );
  });

  it("closes on ordinary outside click when not pinned", () => {
    const target = createElement("div", "page-content");

    assert.equal(
      shouldCloseFloatingOnOutsideClick(target, {
        panelElement: null,
        buttonElement: null,
        isPinned: false,
      }),
      true,
    );
  });
});
