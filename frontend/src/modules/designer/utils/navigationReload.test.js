import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DESIGNER_NAVIGATION_RELOAD_EVENT,
  PORTAL_NAVIGATION_RELOAD_EVENT,
  dispatchPageStatusNavigationRefresh,
} from "./navigationReload";

describe("dispatchPageStatusNavigationRefresh", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches designer and portal navigation reload events", () => {
    const dispatchEvent = vi.fn();
    const originalWindow = globalThis.window;
    globalThis.window = { dispatchEvent };

    try {
      dispatchPageStatusNavigationRefresh();
    } finally {
      globalThis.window = originalWindow;
    }

    expect(dispatchEvent).toHaveBeenCalledTimes(2);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(DESIGNER_NAVIGATION_RELOAD_EVENT);
    expect(dispatchEvent.mock.calls[1][0].type).toBe(PORTAL_NAVIGATION_RELOAD_EVENT);
  });
});
