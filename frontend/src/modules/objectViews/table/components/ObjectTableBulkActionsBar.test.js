import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("ObjectTableBulkActionsBar", () => {
  it("renders bulk actions chrome", () => {
    const source = readFileSync(resolve(here, "ObjectTableBulkActionsBar.jsx"), "utf8");

    expect(source).toContain("Выбрано:");
    expect(source).toContain("Снять выделение");
    expect(source).toContain("Удалить");
    expect(source).toContain("view-engine-hosted-table__bulk-actions");
  });
});
