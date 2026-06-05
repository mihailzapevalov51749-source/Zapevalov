import { describe, expect, it } from "vitest";

import {
  OFFICE_USER_VIEW_UNSAVED_CHANGES_DEFAULT_BOUNDS,
  OFFICE_USER_VIEW_UNSAVED_CHANGES_MODAL_KEY,
  resolveDirtyGuardFooterActions,
  resolveDirtyGuardModalCopy,
} from "./objectTableDirtyGuardModalModel";

describe("ObjectTableDirtyGuardModal", () => {
  it("modal has persistent layout key", () => {
    expect(OFFICE_USER_VIEW_UNSAVED_CHANGES_MODAL_KEY).toBe(
      "office-user-view-unsaved-changes-modal",
    );
  });

  it("modal uses compact confirm default bounds", () => {
    expect(OFFICE_USER_VIEW_UNSAVED_CHANGES_DEFAULT_BOUNDS).toEqual({
      width: 520,
      height: 280,
    });
  });

  it("unsaved changes modal renders professional copy for user view", () => {
    const copy = resolveDirtyGuardModalCopy("userView", "Мои задачи");

    expect(copy.title).toBe('Изменения в представлении «Мои задачи»');
    expect(copy.messageLine1).toBe('Вы изменили представление «Мои задачи».');
    expect(copy.messageLine2).toBe("Сохранить изменения?");
    expect(copy.hint).toBe("Если не сохранить, изменения будут потеряны.");
  });

  it("save action is available for user view footer", () => {
    expect(resolveDirtyGuardFooterActions("userView")).toEqual({
      showDiscard: true,
      showSaveAsNew: true,
      showSave: true,
    });
  });

  it("save as new action is available for base state", () => {
    expect(resolveDirtyGuardFooterActions("baseState")).toEqual({
      showDiscard: true,
      showSaveAsNew: true,
      showSave: false,
    });
  });

  it("discard action keeps existing behavior slot", () => {
    expect(resolveDirtyGuardFooterActions("userView").showDiscard).toBe(true);
  });

  it("close action is not a footer button (cancel via X/Esc only)", () => {
    const actions = resolveDirtyGuardFooterActions("userView");
    expect(Object.keys(actions)).not.toContain("showCancel");
  });

  it("base state copy keeps save-as-new scenario", () => {
    const copy = resolveDirtyGuardModalCopy("baseState", "Все");

    expect(copy.messageLine2).toContain("новое представление");
  });

  it("modal uses PlatformModal with persistent layout", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(
      new URL("./ObjectTableDirtyGuardModal.jsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("PlatformModal");
    expect(source).toContain("canCustomizeLayout");
    expect(source).toContain("modalKey={OFFICE_USER_VIEW_UNSAVED_CHANGES_MODAL_KEY}");
    expect(source).toContain("data-platform-modal-drag-handle");
    expect(source).not.toContain("Отмена");
  });
});
