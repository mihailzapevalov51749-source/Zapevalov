import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../../../..");

test("designer shell no longer registers architecture governance menu item", () => {
  const source = readFileSync(
    join(__dirname, "../../designer/components/shell/DesignerShell.jsx"),
    "utf8",
  );

  assert.doesNotMatch(source, /system-designer-architecture-governance/);
  assert.doesNotMatch(source, /title: "Архитектурное управление"/);
  assert.match(source, /filterArchitectureGovernanceStudioMenuItems/);
});

test("designer navigation resolver excludes architecture governance section", () => {
  const source = readFileSync(
    join(__dirname, "../../../shared/shell/designer/designerNavigationResolver.js"),
    "utf8",
  );

  assert.doesNotMatch(source, /key: "architecture-governance"/);
  assert.doesNotMatch(source, /Архитектурное управление/);
});

test("legacy architecture governance route redirects to platform architecture", () => {
  const appSource = readFileSync(join(__dirname, "../../../App.jsx"), "utf8");
  const redirectSource = readFileSync(
    join(__dirname, "../pages/ArchitectureGovernanceLegacyRedirect.jsx"),
    "utf8",
  );

  assert.match(appSource, /ArchitectureGovernanceLegacyRedirect/);
  assert.doesNotMatch(appSource, /PlatformArchitectureGovernancePage/);
  assert.match(redirectSource, /platform-architecture\?registry=/);
});

test("governance architecture documents remain in repository", () => {
  const standards = readFileSync(
    join(repoRoot, "docs/architecture/YASNOPRO_PLATFORM_STANDARDS.md"),
    "utf8",
  );
  const governance = readFileSync(
    join(repoRoot, "docs/architecture/YASNOPRO_ARCHITECTURE_GOVERNANCE.md"),
    "utf8",
  );

  assert.match(standards, /конституц/i);
  assert.match(governance, /доставк/i);
});
