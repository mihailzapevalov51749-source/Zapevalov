import { describe, expect, it } from "vitest";

import {
  DEFAULT_HIERARCHY_LABELS,
  buildBulkDeleteLabels,
  buildBulkDeleteStatsBadges,
  buildObjectEntityBulkDeleteScenarioOptions,
  buildObjectEntityDeleteScenarioOptions,
  formatBulkDeleteScenarioSubtitle,
  formatCreateChildMenuLabel,
  formatDeleteScenarioSubtitle,
  resolveHierarchyLabels,
  resolveHierarchyLabelsFromRelation,
  suggestRussianHierarchyInflection,
} from "./hierarchyLabels.js";

describe("hierarchyLabels", () => {
  it("auto inflection suggests labels for feminine -а", () => {
    const suggested = suggestRussianHierarchyInflection("Подзадача", "Задача");
    expect(suggested.children).toBe("Подзадачи");
    expect(suggested.children_genitive).toBe("Подзадач");
    expect(suggested.children_instrumental).toBe("Подзадачами");
  });

  it("manual label correction is preserved in resolveHierarchyLabels", () => {
    const labels = resolveHierarchyLabels({
      child: "Подзадача",
      children: "Кастомные элементы",
      children_genitive: "Кастомных элементов",
    });

    expect(labels.children).toBe("Кастомные элементы");
    expect(labels.children_genitive).toBe("Кастомных элементов");
    expect(labels.child).toBe("Подзадача");
  });

  it("fallback does not use task/subtask wording", () => {
    const labels = resolveHierarchyLabelsFromRelation({
      key: "task_subtask",
      settings_json: { semantic_profile: "task_subtask" },
    });

    expect(labels).toEqual(DEFAULT_HIERARCHY_LABELS);
    expect(Object.values(labels).join(" ")).not.toMatch(/Подзадач/i);
  });

  it("row menu uses child label", () => {
    expect(formatCreateChildMenuLabel("Подзадача")).toBe("Создать подзадачу");
    expect(formatCreateChildMenuLabel("Подразделение")).toBe("Создать подразделение");
    expect(formatCreateChildMenuLabel("")).toBe("Создать дочернюю запись");
  });

  it("delete scenario modal uses children labels", () => {
    const labels = {
      children: "Подзадачи",
      children_genitive: "Подзадач",
    };
    const options = buildObjectEntityDeleteScenarioOptions(labels);

    expect(options[0].description).toContain("Подзадачи сохранятся");
    expect(options[1].title).toBe("Удалить запись и все подзадачи");
    expect(formatDeleteScenarioSubtitle(labels)).toContain("связанные подзадачи");
  });

  it("delete scenario uses fallback labels when empty", () => {
    const options = buildObjectEntityDeleteScenarioOptions(null);
    expect(options[0].description).toContain("Дочерние записи");
    expect(formatDeleteScenarioSubtitle(null)).toContain("дочерние записи");
  });

  it("bulk delete modal uses hierarchy_labels terminology", () => {
    const labels = {
      child: "Подзадача",
      children: "Подзадачи",
      children_genitive: "Подзадач",
      children_instrumental: "Подзадачами",
    };
    const aggregate = {
      selectedCount: 2,
      recordsWithChildren: 1,
      totalChildren: 5,
    };

    const options = buildObjectEntityBulkDeleteScenarioOptions(labels);
    expect(options[0].description).toBe(
      "Подзадачи сохранятся. Связи с удаляемыми записями будут удалены.",
    );
    expect(options[1].title).toBe("Удалить выбранные записи и все подзадачи");
    expect(formatBulkDeleteScenarioSubtitle(labels)).toContain("связанные подзадачи");

    const badges = buildBulkDeleteStatsBadges(aggregate, labels);
    expect(badges).toEqual([
      { label: "Выбрано", value: 2 },
      { label: "С подзадачами", value: 1 },
      { label: "Подзадач", value: 5 },
    ]);

    const bundle = buildBulkDeleteLabels(labels, aggregate);
    expect(bundle.warningItems[1]).toBe("все найденные подзадачи");
  });

  it("bulk delete modal adapts to project hierarchy labels", () => {
    const labels = {
      child: "Подпроект",
      children: "Подпроекты",
      children_genitive: "Подпроектов",
      children_instrumental: "Подпроектами",
    };

    const options = buildObjectEntityBulkDeleteScenarioOptions(labels);
    expect(options[1].title).toBe("Удалить выбранные записи и все подпроекты");
    expect(options[0].description).toContain("Подпроекты сохранятся");
  });
});
