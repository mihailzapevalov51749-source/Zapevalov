import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  attachUserIdentity,
  buildObjectCardHostContext,
  buildPlatformDashboardHostContext,
  buildUserIdentityFromCurrentUser,
} from "./hostContextBuilders.js";
import { buildObjectCardContext } from "./embedded/surfaceAdapters.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readBackendSource(relativePath) {
  return readFileSync(
    join(__dirname, "..", "..", "..", "backend", "app", relativePath),
    "utf8",
  );
}

describe("yasii user identity integration", () => {
  it("builds userIdentity from current user shape", () => {
    const identity = buildUserIdentityFromCurrentUser({
      id: 7,
      email: "user@example.com",
      full_name: "Михаил Запевалов",
      position: "Архитектор",
      department: "ИТ",
      role: "admin",
      avatar_url: "/avatars/7.png",
    });

    assert.equal(identity.userId, "7");
    assert.equal(identity.displayName, "Михаил Запевалов");
    assert.equal(identity.email, "user@example.com");
    assert.deepEqual(identity.roles, ["admin"]);
  });

  it("attaches userIdentity to dashboard and object card HostContext", () => {
    const user = {
      id: 9,
      email: "card@example.com",
      full_name: "Анна Иванова",
      role: "platform_designer",
    };

    const dashboard = buildPlatformDashboardHostContext({
      tenantId: "1",
      userId: "9",
      widgetId: "dashboard",
    });
    const withUser = attachUserIdentity(
      { ...dashboard, userId: "9" },
      user,
    );
    assert.equal(withUser.userIdentity.userId, "9");
    assert.match(withUser.userIdentity.displayName, /Анна/);

    const objectCard = buildObjectCardContext({
      tenantId: "1",
      userId: "9",
      objectTypeId: "ot-1",
      objectId: "obj-1",
      objectTitle: "Заявка",
    });
    const objectWithUser = attachUserIdentity(objectCard, user);
    assert.equal(objectWithUser.userIdentity.email, "card@example.com");
  });

  it("wires userIdentity through ACE and runtime", () => {
    const hostSource = readBackendSource("modules/ai_context/host_context.py");
    const handoffSource = readBackendSource("modules/ai_context/handoff.py");
    const handoffServiceSource = readBackendSource("modules/ai_context/handoff_service.py");
    const runtimeSource = readBackendSource("modules/yasii/runtime_orchestrator.py");
    const answersSource = readBackendSource("modules/yasii/user_identity_answers.py");
    const runtimeDemoSource = readBackendSource("modules/yasii/runtime_demo_service.py");

    assert.match(hostSource, /userIdentity/);
    assert.match(handoffSource, /userIdentity/);
    assert.match(handoffServiceSource, /userIdentity/);
    assert.match(runtimeSource, /userIdentity/);
    assert.match(answersSource, /resolve_user_identity_command/);
    assert.match(runtimeDemoSource, /user_identity_message/);
    assert.match(runtimeDemoSource, /USER_IDENTITY_LOADED/);
  });

  it("keeps identity when switching surfaces via adapters", () => {
    const user = {
      id: 3,
      full_name: "Пётр Сидоров",
      email: "petr@example.com",
      role: "admin",
    };

    const dashboard = attachUserIdentity(
      buildPlatformDashboardHostContext({ tenantId: "1", userId: "3" }),
      user,
    );
    const objectCard = attachUserIdentity(
      buildObjectCardHostContext({
        tenantId: "1",
        userId: "3",
        objectTypeId: "type",
        objectId: "id",
      }),
      user,
    );

    assert.equal(dashboard.userIdentity.userId, "3");
    assert.equal(objectCard.userIdentity.userId, "3");
    assert.equal(objectCard.userIdentity.email, "petr@example.com");
  });
});
