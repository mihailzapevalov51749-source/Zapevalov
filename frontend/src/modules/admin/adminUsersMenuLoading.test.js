import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const adminDir = dirname(fileURLToPath(import.meta.url));
const portalDir = join(adminDir, "../../../portal");

test("AdminUsersPage does not depend on runtime navigation error banner", () => {
  const portalSource = readFileSync(join(portalDir, "PortalPageView.jsx"), "utf8");
  const usersSource = readFileSync(join(adminDir, "users/AdminUsersPage.jsx"), "utf8");

  assert.match(portalSource, /resolveTenantAdminPage\(tenantSuffix\)/);
  assert.match(portalSource, /enabled:\s*!isDesignerShellEmbeddedRoute/);
  assert.doesNotMatch(usersSource, /Ошибка загрузки меню/);
  assert.match(usersSource, /getTenantUsers/);
});

test("failed optional menu load does not block users list rendering path", () => {
  const portalSource = readFileSync(join(portalDir, "PortalPageView.jsx"), "utf8");

  assert.match(
    portalSource,
    /!isCorporateChatPage && isAdminPage && adminPageContent/,
  );
  assert.match(portalSource, /navigationError && !isDesignerShellEmbeddedRoute/);
});

test("administration page resolves tenant portal id from designer path", () => {
  const portalSource = readFileSync(join(portalDir, "PortalPageView.jsx"), "utf8");

  assert.match(portalSource, /resolveStudioTenantIdFromPath\(location\.pathname\)/);
  assert.match(
    portalSource,
    /portalIdParam \|\| studioTenantId \|\| 1/,
  );
});
