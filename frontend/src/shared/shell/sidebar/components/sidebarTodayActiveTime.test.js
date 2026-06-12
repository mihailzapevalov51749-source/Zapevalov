import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

test("SidebarTodayActiveTime opens UserActivityModal on click", () => {
  const source = readSource("SidebarTodayActiveTime.jsx");

  assert.match(source, /type="button"/);
  assert.match(source, /UserActivityModal/);
  assert.match(source, /Посмотреть активность/);
  assert.match(source, /setIsActivityModalOpen\(true\)/);
});

test("UserActivityModal uses PlatformModal with ProfileActivityPanel", () => {
  const source = readSource("../../../../profile/components/UserActivityModal.jsx");

  assert.match(source, /import PlatformModal from/);
  assert.match(source, /canCustomizeLayout/);
  assert.match(source, /ProfileActivityPanel/);
  assert.match(source, /USER_ACTIVITY_MODAL_KEY/);
  assert.match(source, /platform-modal-footer/);
  assert.match(source, /Моя активность/);
});

test("ProfileSidePanel reuses ProfileActivityPanel", () => {
  const source = readSource("../../../../profile/components/ProfileSidePanel.jsx");

  assert.match(source, /ProfileActivityPanel/);
});
