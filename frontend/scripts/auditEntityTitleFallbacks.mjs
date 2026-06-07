#!/usr/bin/env node
/**
 * Read-only audit: entity title/name fallback patterns in object platform runtime.
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

const patterns = [
  { id: "F7", pattern: "resolvePlanEntityTitle", scope: "Plan Issues (removed in 5E)" },
  { id: "title-name-fallback", pattern: 'getPlanEntityFieldValue\\([^,]+, ["\']title["\']\\)', scope: "Plan entity utils" },
  { id: "title-or-name", pattern: "title \\|\\| name", scope: "generic title||name" },
  { id: "entity-title", pattern: "entity\\?\\.title", scope: "entity.title direct" },
  { id: "entity-name", pattern: "entity\\?\\.name", scope: "entity.name direct" },
];

const scanDirs = [
  "modules/objectViews",
  "modules/objectEntities",
  "shared/fieldEditors",
  "shared/search",
];

const results = [];

for (const { id, pattern, scope } of patterns) {
  let hits = [];
  for (const dir of scanDirs) {
    try {
      const output = execSync(
        `rg -n "${pattern}" "${path.join(root, dir)}" --glob "*.{js,jsx,ts,tsx}" || true`,
        { encoding: "utf8", shell: true },
      ).trim();
      if (output) {
        hits.push(...output.split("\n").filter(Boolean));
      }
    } catch {
      // no matches
    }
  }
  results.push({ id, scope, count: hits.length, hits });
}

const migrated = [
  "ObjectPlanView.jsx (Issues Panel)",
  "RelationFieldPeerSelect.jsx",
  "RelationFilterPeerSelect.jsx",
  "ObjectEntityRelatedEntities.jsx",
  "HierarchyChildRelationsGroup.jsx",
  "mapRelationInstancesToGroups.js",
  "mapRuntimeEntityToCardModel.js",
  "resolveParentContextFromRelations.js",
  "resolveSubtasksFromRelations.js",
];

const report = {
  auditedAt: new Date().toISOString(),
  runtimeTitleFallbacks: results.reduce((sum, item) => sum + item.count, 0),
  entityTitleResolver: "resolveEntityDisplayTitle",
  componentsMigrated: migrated.length,
  migratedComponents: migrated,
  patterns: results,
  remainingOutOfScope: [
    "shared/shell/header (portal navigation labels)",
    "modules/universalTable (legacy table module)",
    "modules/navigation (menu item titles)",
    "backend search API (server-side titles)",
  ],
};

console.log(JSON.stringify(report, null, 2));
