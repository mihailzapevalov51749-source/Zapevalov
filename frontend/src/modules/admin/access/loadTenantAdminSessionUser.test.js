import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canAccessTenantAdministration } from "../../../shared/tenantRoles/tenantRoleModel.js";
import { normalizeCurrentUser } from "../../../api/authApi.js";
import { normalizeBridgeSessionUser } from "../../../api/sessionBridgeApi.js";

test("TenantAdministrationAccessGate uses loadTenantAdminSessionUser not login getMe", () => {
  const gateSource = readFileSync(
    new URL("../components/TenantAdministrationAccessGate.jsx", import.meta.url),
    "utf8",
  );

  assert.match(gateSource, /loadTenantAdminSessionUser/);
  assert.doesNotMatch(gateSource, /await getMe\(/);
});

test("loadTenantAdminSessionUser never imports auth getMe", () => {
  const loaderSource = readFileSync(
    new URL("./loadTenantAdminSessionUser.js", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(loaderSource, /getMe/);
  assert.match(loaderSource, /getBridgeMe/);
  assert.match(loaderSource, /hasActiveBridgeSession/);
});

test("TEMPLATE bridge /me user grants administration access", () => {
  const bridgeUser = normalizeCurrentUser(
    normalizeBridgeSessionUser({
      principal_type: "bridge",
      platform_role: "platform_owner",
      portal_id: 2,
      database_name: "yasnopro_template",
      environment_key: "TEMPLATE",
      is_infrastructure_superadmin: true,
      is_platform_owner: true,
      effective_role: "superadmin",
      display_name: "Михаил Запевалов",
      email: "zmn8@ya.ru",
    }),
  );

  assert.equal(bridgeUser.full_name, "Михаил Запевалов");
  assert.equal(bridgeUser.email, "zmn8@ya.ru");
  assert.equal(canAccessTenantAdministration(bridgeUser), true);
});

test("CLIENT bridge without infra flags is denied administration access", () => {
  const bridgeUser = normalizeCurrentUser(
    normalizeBridgeSessionUser({
      principal_type: "bridge",
      platform_role: "platform_owner",
      portal_id: 21,
      database_name: "yasnopro_client",
      is_infrastructure_superadmin: false,
      is_platform_owner: false,
    }),
  );

  assert.equal(canAccessTenantAdministration(bridgeUser), false);
});
