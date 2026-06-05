import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  applyPageStatusToPublicationPaths,
  PAGE_SORT_KEYS,
  PAGE_STATUS_FILTERS,
  buildUnifiedUsageTreeLines,
  collectBindingPaths,
  collectPublicationPaths,
  dedupePaths,
  filterAndSortPages,
  formatBlockCountLabel,
  formatAuditLine,
  resolveRelatedObjects,
  buildBlockTreeLines,
} from "./pagesRegistryUtils.js";

describe("pagesRegistryUtils", () => {
  it("filters pages by status", () => {
    const filtered = filterAndSortPages(
      [
        { id: 1, title: "A", status: "draft", page_type: "", workspace_label: "", slug: "", status_label: "", updated_at: null },
        { id: 2, title: "B", status: "published", page_type: "", workspace_label: "", slug: "", status_label: "", updated_at: null },
      ],
      {
        searchText: "",
        statusFilter: PAGE_STATUS_FILTERS.PUBLISHED,
        sortKey: PAGE_SORT_KEYS.TITLE,
        sortDirection: "asc",
      },
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 2);
  });

  it("filters pages by hidden status", () => {
    const filtered = filterAndSortPages(
      [
        { id: 1, title: "A", status: "draft", page_type: "", workspace_label: "", slug: "", status_label: "", updated_at: null },
        { id: 2, title: "B", status: "hidden", page_type: "", workspace_label: "", slug: "", status_label: "", updated_at: null },
        { id: 3, title: "C", status: "published", page_type: "", workspace_label: "", slug: "", status_label: "", updated_at: null },
      ],
      {
        searchText: "",
        statusFilter: PAGE_STATUS_FILTERS.HIDDEN,
        sortKey: PAGE_SORT_KEYS.TITLE,
        sortDirection: "asc",
      },
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 2);
  });

  it("collects publication paths from backend path_segments", () => {
    const paths = collectPublicationPaths([
      {
        kind: "navigation",
        path_segments: ["Офис", "Навигация", "Вторая"],
      },
      {
        kind: "workspace_tab",
        path_segments: ["Офис", "Рабочее пространство", "Проекты", "Вкладка", "План"],
      },
    ]);

    assert.equal(paths.length, 2);
    assert.deepEqual(paths[0], ["Офис", "Навигация", "Вторая"]);
    assert.deepEqual(paths[1], [
      "Офис",
      "Рабочее пространство",
      "Проекты",
      "Вкладка",
      "План",
    ]);
  });

  it("keeps publication paths for hidden with status suffix", () => {
    const paths = applyPageStatusToPublicationPaths(
      [["Офис", "Навигация", "Вторая"]],
      "hidden",
    );
    assert.deepEqual(paths, [["Офис", "Навигация", "Вторая (скрыта)"]]);
  });

  it("keeps publication paths for draft with status suffix", () => {
    const paths = applyPageStatusToPublicationPaths(
      [["Офис", "Навигация", "Вторая"]],
      "draft",
    );
    assert.deepEqual(paths, [["Офис", "Навигация", "Вторая (черновик)"]]);
  });

  it("collects binding paths for delete modal", () => {
    const paths = collectBindingPaths([
      {
        kind: "navigation",
        path_segments: ["Офис", "Навигация", "Скрытая"],
      },
    ]);

    assert.deepEqual(paths[0], ["Офис", "Навигация", "Скрытая"]);
  });

  it("builds unified publication tree with branch connectors", () => {
    const lines = buildUnifiedUsageTreeLines([
      ["Офис", "Навигация", "Главная"],
      ["Офис", "Рабочее пространство", "Проекты", "Главная страница"],
    ]);

    assert.equal(lines[0].label, "Офис");
    assert.equal(lines[0].treePrefix, "");
    assert.ok(lines.some((line) => line.label === "Навигация"));
    assert.ok(lines.some((line) => line.label === "Рабочее пространство"));
  });

  it("formats audit lines with author fallback", () => {
    assert.equal(formatAuditLine("Создана", null, ""), "Создана: — (—)");
  });

  it("resolves related objects from blocks", () => {
    const names = resolveRelatedObjects({
      blocks: [{ related_object_names: ["Задачник", "Пользователи"] }],
    });
    assert.deepEqual(names, ["Задачник", "Пользователи"]);
  });

  it("formats block count labels in Russian", () => {
    assert.equal(formatBlockCountLabel(1), "1 блок");
    assert.equal(formatBlockCountLabel(3), "3 блока");
    assert.equal(formatBlockCountLabel(5), "5 блоков");
    assert.equal(formatBlockCountLabel(0), "0 блоков");
  });

  it("deduplicates publication paths", () => {
    assert.deepEqual(
      dedupePaths([
        ["Офис", "Навигация", "Вторая"],
        ["Офис", "Навигация", "Вторая"],
      ]),
      [["Офис", "Навигация", "Вторая"]],
    );
  });

  it("builds block tree lines with tree prefixes", () => {
    assert.deepEqual(buildBlockTreeLines([{ label: "Изображение" }]), [
      { prefix: "└", label: "Изображение", depth: 1 },
    ]);

    assert.deepEqual(
      buildBlockTreeLines([
        { label: "Изображение" },
        { display_title: "Таблица" },
        { label: "Панель" },
      ]),
      [
        { prefix: "├", label: "Изображение", depth: 1 },
        { prefix: "├", label: "Таблица", depth: 1 },
        { prefix: "└", label: "Панель", depth: 1 },
      ],
    );
  });
});
