import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNavigationMenuSavePayload,
  hasNavigationMenuIcon,
  mergeNavigationMenuSettingRecord,
  resolveNavigationMenuIconFileUrl,
  sanitizeNavigationMenuSettingRecord,
  stripNavigationMenuSystemIconsFromItem,
} from "./navigationMenuIconPolicy.js";

describe("navigationMenuIconPolicy", () => {
  it("shows uploaded icon only when icon_file_url is present", () => {
    const withUpload = {
      title: "Компании",
      icon_type: "users",
      icon: "users",
      icon_file_url: "/uploads/icons/companies.png",
    };

    assert.equal(resolveNavigationMenuIconFileUrl(withUpload), "/uploads/icons/companies.png");
    assert.equal(hasNavigationMenuIcon(withUpload), true);
  });

  it("ignores system icon fields when no uploaded file exists", () => {
    const withoutUpload = {
      title: "Компании",
      icon_type: "users",
      icon: "users",
    };

    assert.equal(resolveNavigationMenuIconFileUrl(withoutUpload), null);
    assert.equal(hasNavigationMenuIcon(withoutUpload), false);
  });

  it("uses display_icon_file_url for object type navigation items", () => {
    const objectTypeItem = {
      type: "object_type",
      display_icon_file_url: "/uploads/icons/object-type.png",
      icon_type: "library",
      icon: "objects",
    };

    assert.equal(
      resolveNavigationMenuIconFileUrl(objectTypeItem),
      "/uploads/icons/object-type.png",
    );
  });

  it("sanitizes settings to uploaded icon fields only", () => {
    const sanitized = sanitizeNavigationMenuSettingRecord({
      title: " Релизы ",
      icon: "objects",
      icon_type: "library",
      icon_file_url: "/uploads/icons/releases.svg",
      color: "#111827",
    });

    assert.deepEqual(sanitized, {
      title: "Релизы",
      icon_file_url: "/uploads/icons/releases.svg",
      color: "#111827",
    });
  });

  it("merges settings without persisting legacy icon fields", () => {
    const merged = mergeNavigationMenuSettingRecord(
      {
        title: "Релизы",
        icon_type: "objects",
        icon: "objects",
        icon_file_url: "/uploads/icons/old.svg",
      },
      {
        icon_type: "users",
        icon_file_url: null,
      },
    );

    assert.equal(merged.icon_type, undefined);
    assert.equal(merged.icon, undefined);
    assert.equal(merged.icon_file_url, null);
    assert.equal(merged.title, "Релизы");
  });

  it("builds save payload with explicit icon removal", () => {
    const payload = buildNavigationMenuSavePayload({
      title: "Компании",
      icon_type: "users",
      icon_file_url: null,
      is_visible: true,
    });

    assert.deepEqual(payload, {
      title: "Компании",
      icon_file_url: null,
      is_visible: true,
    });
  });

  it("strips system icon fields from navigation items", () => {
    const stripped = stripNavigationMenuSystemIconsFromItem({
      id: "cp-releases",
      title: "Релизы",
      icon_type: "objects",
      icon: "objects",
    });

    assert.equal(stripped.icon_type, undefined);
    assert.equal(stripped.icon, undefined);
    assert.equal(stripped.icon_file_url, undefined);
  });

  it("uses icon_file_url fallback for object type navigation items", () => {
    const objectTypeItem = {
      type: "object_type",
      object_type_id: "ot-1",
      icon_file_url: "/uploads/icons/object-type-fallback.png",
      icon_type: "library",
    };

    assert.equal(
      resolveNavigationMenuIconFileUrl(objectTypeItem),
      "/uploads/icons/object-type-fallback.png",
    );
  });

  it("object type without uploaded icon renders no icon", () => {
    const objectTypeItem = {
      type: "object_type",
      object_type_id: "ot-1",
      icon_type: "tasks",
      icon: "tasks",
    };

    assert.equal(resolveNavigationMenuIconFileUrl(objectTypeItem), null);
    assert.equal(hasNavigationMenuIcon(objectTypeItem), false);
  });

  it("ignores spurious tenant icon_file_url null without other overrides", () => {
    const sanitized = sanitizeNavigationMenuSettingRecord({
      item_key: "nav:377",
      navigation_item_id: 377,
      icon_file_url: null,
      icon_type: null,
      title: null,
    });

    assert.equal(sanitized, null);
  });

  it("preserves object_type display_icon_file_url when stripping system icons", () => {
    const stripped = stripNavigationMenuSystemIconsFromItem({
      id: 377,
      type: "object_type",
      object_type_id: "ot-client",
      title: "Задачник",
      display_icon_file_url: "/uploads/icons/tasks-client.png",
      icon_type: "tasks",
      icon: "tasks",
    });

    assert.equal(stripped.display_icon_file_url, "/uploads/icons/tasks-client.png");
    assert.equal(stripped.icon_type, undefined);
    assert.equal(stripped.icon, undefined);
  });

  it("legacy iconType and icon_type are ignored for icon resolution", () => {
    const item = {
      title: "Компании",
      iconType: "users",
      icon_type: "users",
      icon: "users",
    };

    assert.equal(resolveNavigationMenuIconFileUrl(item), null);
    assert.equal(hasNavigationMenuIcon(item), false);
  });
});
