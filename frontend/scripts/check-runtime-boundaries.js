import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");

const allowedImporterPrefixes = [
  path.join(srcRoot, "modules", "runtimeReadGateway", "providers") + path.sep,
  path.join(srcRoot, "modules", "runtimeReadGateway", "mappers") + path.sep,
  path.join(srcRoot, "modules", "runtimeLegacyWriteAdapter") + path.sep,
  path.join(srcRoot, "modules", "universalTable") + path.sep,
];

const forbiddenTargets = new Set([
  path.join(srcRoot, "modules", "universalTable", "services", "tableApi.js"),
  path.join(srcRoot, "modules", "universalTable", "services", "universalViewsApi.js"),
]);

const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);

const importRegex =
  /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["'`]([^"'`]+)["'`]|require\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function isSourceFile(filePath) {
  return sourceExtensions.has(path.extname(filePath));
}

function isAllowedImporter(importerFile) {
  return allowedImporterPrefixes.some((prefix) => importerFile.startsWith(prefix));
}

function resolveImportTarget(importerFile, rawImportPath) {
  if (!rawImportPath?.startsWith(".")) {
    return null;
  }

  const importerDir = path.dirname(importerFile);
  const directTarget = path.resolve(importerDir, rawImportPath);
  const candidates = [
    directTarget,
    `${directTarget}.js`,
    `${directTarget}.jsx`,
    `${directTarget}.ts`,
    `${directTarget}.tsx`,
    path.join(directTarget, "index.js"),
    path.join(directTarget, "index.jsx"),
  ];

  return candidates.find((candidate) => forbiddenTargets.has(candidate)) || null;
}

async function collectSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && isSourceFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const files = await collectSourceFiles(srcRoot);
  const violations = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    importRegex.lastIndex = 0;

    let match = importRegex.exec(content);
    while (match) {
      const importPath = match[1] || match[2];
      const resolvedTarget = resolveImportTarget(filePath, importPath);

      if (resolvedTarget && !isAllowedImporter(filePath)) {
        violations.push({
          importer: path.relative(projectRoot, filePath),
          target: path.relative(projectRoot, resolvedTarget),
          importPath,
        });
      }

      match = importRegex.exec(content);
    }
  }

  if (!violations.length) {
    console.log("Runtime boundary check passed: no forbidden direct legacy imports.");
    process.exit(0);
  }

  console.error("Runtime boundary violations found:");
  for (const violation of violations) {
    console.error(
      `- ${toPosix(violation.importer)} -> ${violation.importPath} (${toPosix(violation.target)})`,
    );
  }
  process.exit(1);
}

main().catch((error) => {
  console.error("Runtime boundary check failed with error:", error?.message || error);
  process.exit(1);
});
