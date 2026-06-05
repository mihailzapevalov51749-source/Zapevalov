import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NAVIGATION_DELETE_CONFIRM_DEFAULT_BOUNDS,
  NAVIGATION_DELETE_CONFIRM_MODAL_KEY,
  NAVIGATION_DELETE_MODAL_MIN_HEIGHT,
  NAVIGATION_DELETE_MODAL_MIN_WIDTH,
  NAVIGATION_DELETE_NOTICE_MODAL_KEY,
} from "./navigationDeleteModalKeys";

const here = dirname(fileURLToPath(import.meta.url));

describe("navigation delete modals platform layout", () => {
  it("uses persisted modal keys", () => {
    expect(NAVIGATION_DELETE_CONFIRM_MODAL_KEY).toBe("navigation-delete-confirm-modal");
    expect(NAVIGATION_DELETE_NOTICE_MODAL_KEY).toBe("navigation-delete-notice-modal");
  });

  it("defines compact initial bounds with platform minimums", () => {
    expect(NAVIGATION_DELETE_CONFIRM_DEFAULT_BOUNDS.width).toBeGreaterThanOrEqual(
      NAVIGATION_DELETE_MODAL_MIN_WIDTH,
    );
    expect(NAVIGATION_DELETE_CONFIRM_DEFAULT_BOUNDS.height).toBeGreaterThanOrEqual(
      NAVIGATION_DELETE_MODAL_MIN_HEIGHT,
    );
  });

  it("enables full PlatformModal layout customization", () => {
    const confirmSource = readFileSync(
      resolve(here, "NavigationDeleteConfirmModal.jsx"),
      "utf8",
    );
    const noticeSource = readFileSync(
      resolve(here, "NavigationDeleteNoticeModal.jsx"),
      "utf8",
    );

    expect(confirmSource).toMatch(/canCustomizeLayout/);
    expect(confirmSource).toMatch(/keepFullyVisible/);
    expect(confirmSource).toMatch(/defaultBounds=\{NAVIGATION_DELETE_CONFIRM_DEFAULT_BOUNDS\}/);
    expect(confirmSource).not.toMatch(/canCustomizeLayout=\{false\}/);

    expect(noticeSource).toMatch(/canCustomizeLayout/);
    expect(noticeSource).not.toMatch(/canCustomizeLayout=\{false\}/);
  });
});
