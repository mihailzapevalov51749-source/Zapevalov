import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const configDir = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(configDir, "..");

function read(relativePath) {
  return readFileSync(join(srcRoot, relativePath), "utf8");
}

async function importFreshApiConfig(envValue) {
  const previous = process.env.VITE_API_BASE_URL;
  if (envValue === undefined) {
    delete process.env.VITE_API_BASE_URL;
  } else {
    process.env.VITE_API_BASE_URL = envValue;
  }

  const moduleUrl = `${pathToFileURL(join(configDir, "apiConfig.js"))}?t=${Date.now()}`;
  const loaded = await import(moduleUrl);

  if (previous === undefined) {
    delete process.env.VITE_API_BASE_URL;
  } else {
    process.env.VITE_API_BASE_URL = previous;
  }

  return loaded;
}

describe("apiConfig", () => {
  it("exposes configured API_BASE_URL", async () => {
    const { API_BASE_URL } = await importFreshApiConfig("http://127.0.0.1:8011");
    assert.equal(API_BASE_URL, "http://127.0.0.1:8011");
  });

  it("fails fast when VITE_API_BASE_URL is missing", async () => {
    await assert.rejects(
      () => importFreshApiConfig(""),
      /Frontend Environment Error/,
    );
  });

  it("joinApiUrl prefixes relative paths", async () => {
    const { joinApiUrl } = await importFreshApiConfig("http://127.0.0.1:8012");
    assert.equal(joinApiUrl("/auth/login"), "http://127.0.0.1:8012/auth/login");
  });

  it("resolveDockerAccessibleApiUrl rewrites API origin for Docker", async () => {
    const { resolveDockerAccessibleApiUrl } = await importFreshApiConfig(
      "http://127.0.0.1:8010",
    );
    assert.equal(
      resolveDockerAccessibleApiUrl("http://127.0.0.1:8010/files/documents/a.docx"),
      "http://host.docker.internal:8010/files/documents/a.docx",
    );
  });
});

describe("apiConfig architecture guard", () => {
  it("does not keep hardcoded backend URLs in production API clients", () => {
    const offenders = [];
    const pattern = /127\.0\.0\.1:8010|localhost:8010/;

    for (const relativePath of [
      "api/apiClient.js",
      "api/authApi.js",
      "api/userActivityApi.js",
      "modules/calendar/api/calendarApi.js",
      "modules/chats/api/chatsApi.js",
      "modules/comments/api/commentsApi.js",
      "modules/notifications/api/notificationsApi.js",
      "modules/designer/api/platformApiClient.js",
      "modules/platformSetup/platformSetupApi.js",
      "shared/checklists/checklistApi.js",
      "shared/notes/notesApi.js",
      "shared/notes/utils/noteUsersApi.js",
      "shared/files/api/filesApi.js",
      "modules/documentLibraries/services/documentLibrariesService.js",
      "shared/runtimeModuleConfiguration/tenantModuleConfigurationRuntimeApi.js",
      "shared/communication/domain/messageItemUtils.js",
      "modules/comments/domain/commentItemUtils.js",
      "shared/communication/components/MessageComposer.jsx",
      "shared/communication/components/MessageItem.jsx",
      "modules/chats/components/ChatComposer.jsx",
      "modules/admin/users/AdminUsersPage.jsx",
      "modules/admin/users/UserEditorCard.jsx",
      "modules/controlPlane/platformUsers/usePlatformUsersPage.js",
      "modules/controlPlane/platformRoles/usePlatformRolesPage.js",
      "modules/blockTypes/button/ButtonBlockView.jsx",
      "modules/blockTypes/cards/CardsBlockView.jsx",
      "shared/files/components/OfficeViewer.jsx",
    ]) {
      if (pattern.test(read(relativePath))) {
        offenders.push(relativePath);
      }
    }

    assert.deepEqual(offenders, []);
  });
});
