import { assignPlanTreeHierarchyNumbers } from "./planTreeNumbering.js";

/**
 * Studio Preview mock tree — no runtime records.
 */
export function buildPlanPreviewMock() {
  const direction1Step1 = {
    id: "preview-plan-1-1",
    depth: 1,
    title: "Пример шаг 1.1",
    statusLabel: "Готово",
    readiness: 100,
    issuesCount: 0,
    description: "Демонстрационный элемент плана в Studio Preview.",
    nextSteps: ["Проверить настройки", "Опубликовать каталог"],
    children: [],
    entity: { id: "preview-plan-1-1" },
  };

  const direction1Step2 = {
    id: "preview-plan-1-2",
    depth: 1,
    title: "Пример шаг 1.2",
    statusLabel: "В работе",
    readiness: 50,
    issuesCount: 1,
    description: null,
    nextSteps: ["Подготовить демо"],
    children: [],
    entity: { id: "preview-plan-1-2" },
  };

  const direction1 = {
    id: "preview-plan-1",
    depth: 0,
    title: "Пример направления 1",
    statusLabel: "В работе",
    readiness: 75,
    issuesCount: 1,
    description: "Корневой элемент демо-плана.",
    nextSteps: ["Завершить шаг 1.2"],
    children: [direction1Step1, direction1Step2],
    entity: { id: "preview-plan-1" },
  };

  const direction2 = {
    id: "preview-plan-2",
    depth: 0,
    title: "Пример направления 2",
    statusLabel: "Не начато",
    readiness: 0,
    issuesCount: 0,
    description: null,
    nextSteps: [],
    children: [],
    entity: { id: "preview-plan-2" },
  };

  const root = {
    id: "preview-plan-root",
    depth: 0,
    title: "Развитие продукта",
    statusLabel: "В работе",
    readiness: 38,
    issuesCount: 1,
    description: "Mock-план для Studio Preview.",
    nextSteps: ["Настроить иерархию", "Опубликовать объект"],
    children: [direction1, direction2],
    entity: { id: "preview-plan-root" },
  };

  const roots = [root];
  assignPlanTreeHierarchyNumbers(roots);

  const nodesById = new Map([
    [root.id, root],
    [direction1.id, direction1],
    [direction1Step1.id, direction1Step1],
    [direction1Step2.id, direction1Step2],
    [direction2.id, direction2],
  ]);

  return {
    roots,
    nodesById,
    hasHierarchy: true,
    isPreviewMock: true,
  };
}
