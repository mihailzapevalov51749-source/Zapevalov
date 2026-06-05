import { describe, expect, it } from "vitest";

import { TABLE_BASE_STATE_KEY } from "../table/preferences/tableBaseState";
import {
  canApplyOfficeDefaultUserView,
  hasExplicitOfficeRepresentationRequest,
  isExplicitRepresentationRequestKey,
  isObjectTabKey,
  resolveInitialOfficeSelectedViewKey,
  shouldApplyRequestedRepresentationSelection,
} from "./objectTabKeys";

describe("object tab key vs representation key", () => {
  it("object tab key default_table is not an explicit representation request", () => {
    expect(isObjectTabKey("default_table")).toBe(true);
    expect(isExplicitRepresentationRequestKey("default_table")).toBe(false);
    expect(hasExplicitOfficeRepresentationRequest("default_table")).toBe(false);
  });

  it("object tab key default_table does not mark userManuallySelected via selection guard", () => {
    expect(
      shouldApplyRequestedRepresentationSelection({
        requestedRepresentationKey: "default_table",
        isOfficeUserViews: true,
      }),
    ).toBe(false);
  });

  it("object tab key default_table does not force TABLE_BASE_STATE_KEY in initial office resolve", () => {
    expect(
      resolveInitialOfficeSelectedViewKey({
        requestedRepresentationKey: "default_table",
      }),
    ).toBe(TABLE_BASE_STATE_KEY);
  });

  it("user representation key is explicit and applies selection", () => {
    expect(isExplicitRepresentationRequestKey("postavlennye")).toBe(true);
    expect(
      shouldApplyRequestedRepresentationSelection({
        requestedRepresentationKey: "postavlennye",
        isOfficeUserViews: true,
      }),
    ).toBe(true);
    expect(
      resolveInitialOfficeSelectedViewKey({
        requestedRepresentationKey: "postavlennye",
      }),
    ).toBe("postavlennye");
  });

  it("TABLE_BASE_STATE_KEY is explicit representation (manual All / route)", () => {
    expect(isExplicitRepresentationRequestKey(TABLE_BASE_STATE_KEY)).toBe(true);
    expect(
      shouldApplyRequestedRepresentationSelection({
        requestedRepresentationKey: TABLE_BASE_STATE_KEY,
        isOfficeUserViews: true,
      }),
    ).toBe(true);
  });

  it("default user view applies after load when user did not select manually", () => {
    expect(
      canApplyOfficeDefaultUserView({
        isOfficeUserViews: true,
        loading: false,
        userManuallySelected: false,
        initialDefaultApplied: false,
        defaultKey: "postavlennye",
      }),
    ).toBe(true);
  });

  it("manual All selection blocks auto-default only after user action", () => {
    expect(
      canApplyOfficeDefaultUserView({
        isOfficeUserViews: true,
        loading: false,
        userManuallySelected: true,
        initialDefaultApplied: false,
        defaultKey: "postavlennye",
      }),
    ).toBe(false);
  });

  it("manual user view selection blocks auto-default only after user action", () => {
    expect(
      canApplyOfficeDefaultUserView({
        isOfficeUserViews: true,
        loading: false,
        userManuallySelected: true,
        initialDefaultApplied: false,
        defaultKey: "my_tasks",
      }),
    ).toBe(false);
  });

  it("object tab key does not block default via userManuallySelected flag", () => {
    const tabKeyBlocksDefault = hasExplicitOfficeRepresentationRequest("default_table");
    expect(tabKeyBlocksDefault).toBe(false);
    expect(
      canApplyOfficeDefaultUserView({
        isOfficeUserViews: true,
        loading: false,
        userManuallySelected: tabKeyBlocksDefault,
        initialDefaultApplied: false,
        defaultKey: "postavlennye",
      }),
    ).toBe(true);
  });
});
